/**
 * Regression test for the multi-business February employee-loading bug.
 *
 * Repro: Create two businesses (A and B), add employees to each, log work
 * in business A, then fetch the February plan for business B — employees must
 * not be empty.
 */
import { getServerSession } from 'next-auth';
import { POST as plansPOST } from '@/app/api/month-plans/route';
import { POST as cellsPOST } from '@/app/api/cells/route';
import { GET as planGetById } from '@/app/api/month-plans/[id]/route';
import { testPrisma, createTestUser, cleanupUser, makeRequest, mockSession } from './helpers';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockedGetServerSession = getServerSession as jest.Mock;

let userId: string;
let email: string;
let bizAId: string;
let bizBId: string;

const MONTH = 2;
const YEAR = 2025;

beforeAll(async () => {
  ({ userId, email } = await createTestUser('multi-biz-bug'));

  // Create two businesses
  const bizA = await testPrisma.business.create({
    data: { name: 'Business A', locationName: 'Loc A', ownerUserId: userId },
  });
  bizAId = bizA.id;

  const bizB = await testPrisma.business.create({
    data: { name: 'Business B', locationName: 'Loc B', ownerUserId: userId },
  });
  bizBId = bizB.id;
});

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue(mockSession(userId, email));
});

afterAll(async () => {
  await cleanupUser(userId);
  await testPrisma.$disconnect();
});

describe('Multi-business February bug regression', () => {
  it('loads employees for business B after logging work in business A', async () => {
    // 1. Add employees to Business A
    const empA1 = await testPrisma.employee.create({
      data: { fullName: 'A Employee 1', userId, businessId: bizAId, startDate: '2025-01-01' },
    });
    const empA2 = await testPrisma.employee.create({
      data: { fullName: 'A Employee 2', userId, businessId: bizAId, startDate: '2025-01-01' },
    });

    // 2. Add employees to Business B
    const empB1 = await testPrisma.employee.create({
      data: { fullName: 'B Employee 1', userId, businessId: bizBId, startDate: '2025-01-01' },
    });
    const empB2 = await testPrisma.employee.create({
      data: { fullName: 'B Employee 2', userId, businessId: bizBId, startDate: '2025-01-01' },
    });

    // 3. Create February plan for Business A and log work
    const planAReq = makeRequest('http://localhost/api/month-plans', {
      method: 'POST',
      body: { month: MONTH, year: YEAR, businessId: bizAId },
    });
    const planARes = await plansPOST(planAReq);
    const planA = await planARes.json();
    expect(planA.businessId).toBe(bizAId);

    // Fetch the full plan with cells
    const planAFullRes = await planGetById(
      makeRequest(`http://localhost/api/month-plans/${planA.id}`),
      { params: Promise.resolve({ id: planA.id }) }
    );
    const planAFull = await planAFullRes.json();

    // Log work for empA1 on day 5
    const cellsReq = makeRequest('http://localhost/api/cells', {
      method: 'POST',
      body: {
        cells: [{ monthPlanId: planAFull.id, employeeId: empA1.id, day: 5, value: '24' }],
      },
    });
    const cellsRes = await cellsPOST(cellsReq);
    expect(cellsRes.status).toBe(200);

    // 4. Fetch (create) February plan for Business B
    const planBReq = makeRequest('http://localhost/api/month-plans', {
      method: 'POST',
      body: { month: MONTH, year: YEAR, businessId: bizBId },
    });
    const planBRes = await plansPOST(planBReq);
    expect(planBRes.status).toBe(200);
    const planB = await planBRes.json();
    expect(planB.businessId).toBe(bizBId);

    // 5. The plan for Business B must include Business B employees
    const employeeIds: string[] = JSON.parse(planB.employeeIds || '[]');
    expect(employeeIds).toContain(empB1.id);
    expect(employeeIds).toContain(empB2.id);
    expect(employeeIds).not.toContain(empA1.id);
    expect(employeeIds).not.toContain(empA2.id);
    expect(employeeIds.length).toBe(2);
  });

  it('adds newly-created employees to an existing plan on next fetch', async () => {
    // Create a plan for Business B before adding extra employees
    const planBReq1 = makeRequest('http://localhost/api/month-plans', {
      method: 'POST',
      body: { month: 3, year: YEAR, businessId: bizBId },
    });
    const planBRes1 = await plansPOST(planBReq1);
    const planBInitial = await planBRes1.json();
    const initialIds: string[] = JSON.parse(planBInitial.employeeIds || '[]');

    // Add a new employee to Business B after the plan was created
    const empBNew = await testPrisma.employee.create({
      data: { fullName: 'B New Employee', userId, businessId: bizBId, startDate: '2025-01-01' },
    });

    // POST to the same plan again — should refresh employeeIds
    const planBReq2 = makeRequest('http://localhost/api/month-plans', {
      method: 'POST',
      body: { month: 3, year: YEAR, businessId: bizBId },
    });
    const planBRes2 = await plansPOST(planBReq2);
    const planBUpdated = await planBRes2.json();
    const updatedIds: string[] = JSON.parse(planBUpdated.employeeIds || '[]');

    // The new employee must now appear in the plan
    expect(updatedIds).toContain(empBNew.id);
    expect(updatedIds.length).toBe(initialIds.length + 1);

    // Cleanup
    await testPrisma.employee.delete({ where: { id: empBNew.id } });
    await testPrisma.monthPlan.delete({ where: { id: planBInitial.id } });
  });
});
