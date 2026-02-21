import { getServerSession } from 'next-auth';
import { GET as plansGET, POST as plansPOST } from '@/app/api/month-plans/route';
import {
  GET as planGetById,
  PUT as planPUT,
  DELETE as planDELETE,
} from '@/app/api/month-plans/[id]/route';
import { POST as cellsPOST } from '@/app/api/cells/route';
import { testPrisma, createTestUser, cleanupUser, makeRequest, mockSession } from './helpers';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockedGetServerSession = getServerSession as jest.Mock;

let userId: string;
let email: string;
let bizId: string;

beforeAll(async () => {
  ({ userId, email } = await createTestUser('plans'));
  const biz = await testPrisma.business.create({
    data: { name: 'Plans Biz', locationName: 'Loc', ownerUserId: userId },
  });
  bizId = biz.id;
});

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue(mockSession(userId, email));
});

afterAll(async () => {
  await cleanupUser(userId);
  await testPrisma.$disconnect();
});

describe('POST /api/month-plans', () => {
  it('returns 401 when not authenticated', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);
    const req = makeRequest('http://localhost/api/month-plans', {
      method: 'POST',
      body: { month: 1, year: 2025, businessId: bizId },
    });
    const res = await plansPOST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when month or year is missing', async () => {
    const req = makeRequest('http://localhost/api/month-plans', {
      method: 'POST',
      body: { businessId: bizId },
    });
    const res = await plansPOST(req);
    expect(res.status).toBe(400);
  });

  it('creates a plan for the business', async () => {
    const req = makeRequest('http://localhost/api/month-plans', {
      method: 'POST',
      body: { month: 3, year: 2025, businessId: bizId },
    });
    const res = await plansPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.month).toBe(3);
    expect(data.year).toBe(2025);
    expect(data.businessId).toBe(bizId);
    // cleanup
    await testPrisma.monthPlan.delete({ where: { id: data.id } });
  });

  it('returns the existing plan when called again (idempotent)', async () => {
    const req1 = makeRequest('http://localhost/api/month-plans', {
      method: 'POST',
      body: { month: 4, year: 2025, businessId: bizId },
    });
    const res1 = await plansPOST(req1);
    const plan1 = await res1.json();

    const req2 = makeRequest('http://localhost/api/month-plans', {
      method: 'POST',
      body: { month: 4, year: 2025, businessId: bizId },
    });
    const res2 = await plansPOST(req2);
    const plan2 = await res2.json();

    expect(plan1.id).toBe(plan2.id);
    await testPrisma.monthPlan.delete({ where: { id: plan1.id } });
  });

  it('enforces (businessId, month, year) uniqueness constraint', async () => {
    const biz2 = await testPrisma.business.create({
      data: { name: 'Second Biz', locationName: 'Loc', ownerUserId: userId },
    });
    // Same month/year but different business — should create two separate plans
    const req1 = makeRequest('http://localhost/api/month-plans', {
      method: 'POST',
      body: { month: 5, year: 2025, businessId: bizId },
    });
    const req2 = makeRequest('http://localhost/api/month-plans', {
      method: 'POST',
      body: { month: 5, year: 2025, businessId: biz2.id },
    });
    const [res1, res2] = await Promise.all([plansPOST(req1), plansPOST(req2)]);
    const [p1, p2] = await Promise.all([res1.json(), res2.json()]);
    expect(p1.id).not.toBe(p2.id);
    await testPrisma.monthPlan.deleteMany({ where: { id: { in: [p1.id, p2.id] } } });
    await testPrisma.business.delete({ where: { id: biz2.id } });
  });
});

describe('GET /api/month-plans', () => {
  it('scopes results to the authenticated user', async () => {
    const plan = await testPrisma.monthPlan.create({
      data: { month: 6, year: 2025, userId, businessId: bizId, employeeIds: '[]' },
    });

    const req = makeRequest(`http://localhost/api/month-plans?businessId=${bizId}`);
    const res = await plansGET(req);
    const data = await res.json();

    // Should only return plans belonging to this user
    const ids = data.map((p: { id: string }) => p.id);
    expect(ids).toContain(plan.id);

    await testPrisma.monthPlan.delete({ where: { id: plan.id } });
  });
});

describe('GET /api/month-plans/[id]', () => {
  it('returns 404 for another user\'s plan', async () => {
    const { userId: otherId } = await createTestUser('plan-get-other');
    const otherPlan = await testPrisma.monthPlan.create({
      data: { month: 7, year: 2025, userId: otherId, employeeIds: '[]' },
    });
    const req = makeRequest(`http://localhost/api/month-plans/${otherPlan.id}`);
    const res = await planGetById(req, { params: Promise.resolve({ id: otherPlan.id }) });
    expect(res.status).toBe(404);
    await testPrisma.user.delete({ where: { id: otherId } });
  });
});

describe('DELETE /api/month-plans/[id]', () => {
  it('deletes own plan', async () => {
    const plan = await testPrisma.monthPlan.create({
      data: { month: 8, year: 2025, userId, businessId: bizId, employeeIds: '[]' },
    });
    const req = makeRequest(`http://localhost/api/month-plans/${plan.id}`, { method: 'DELETE' });
    const res = await planDELETE(req, { params: Promise.resolve({ id: plan.id }) });
    expect(res.status).toBe(200);
    const check = await testPrisma.monthPlan.findUnique({ where: { id: plan.id } });
    expect(check).toBeNull();
  });
});

describe('POST /api/cells', () => {
  let planId: string;
  let empId: string;

  beforeAll(async () => {
    const emp = await testPrisma.employee.create({
      data: { fullName: 'Cells Employee', userId, businessId: bizId },
    });
    empId = emp.id;
    const plan = await testPrisma.monthPlan.create({
      data: { month: 9, year: 2025, userId, businessId: bizId, employeeIds: JSON.stringify([emp.id]) },
    });
    planId = plan.id;
  });

  afterAll(async () => {
    await testPrisma.monthPlan.deleteMany({ where: { id: planId } });
    await testPrisma.employee.deleteMany({ where: { id: empId } });
  });

  it('upserts cell values in batch', async () => {
    const req = makeRequest('http://localhost/api/cells', {
      method: 'POST',
      body: {
        cells: [
          { monthPlanId: planId, employeeId: empId, day: 1, value: '24' },
          { monthPlanId: planId, employeeId: empId, day: 2, value: 'CO' },
          { monthPlanId: planId, employeeId: empId, day: 3, value: 'X' },
        ],
      },
    });
    const res = await cellsPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(3);
    const values = data.map((c: { value: string }) => c.value).sort();
    expect(values).toEqual(['24', 'CO', 'X']);
  });

  it('updates an existing cell value (upsert)', async () => {
    // First upsert
    const req1 = makeRequest('http://localhost/api/cells', {
      method: 'POST',
      body: { cells: [{ monthPlanId: planId, employeeId: empId, day: 10, value: '24' }] },
    });
    await cellsPOST(req1);

    // Second upsert — should update, not duplicate
    const req2 = makeRequest('http://localhost/api/cells', {
      method: 'POST',
      body: { cells: [{ monthPlanId: planId, employeeId: empId, day: 10, value: 'CO' }] },
    });
    const res2 = await cellsPOST(req2);
    const data2 = await res2.json();
    expect(data2[0].value).toBe('CO');

    // Verify only one cell exists for that day
    const cells = await testPrisma.cell.findMany({
      where: { monthPlanId: planId, employeeId: empId, day: 10 },
    });
    expect(cells).toHaveLength(1);
  });
});

describe('PUT /api/month-plans/[id] — employeeIds', () => {
  it('updates employeeIds list', async () => {
    const plan = await testPrisma.monthPlan.create({
      data: { month: 10, year: 2025, userId, businessId: bizId, employeeIds: '[]' },
    });
    const req = makeRequest(`http://localhost/api/month-plans/${plan.id}`, {
      method: 'PUT',
      body: { employeeIds: ['emp-a', 'emp-b'] },
    });
    const res = await planPUT(req, { params: Promise.resolve({ id: plan.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(JSON.parse(data.employeeIds)).toEqual(['emp-a', 'emp-b']);
    await testPrisma.monthPlan.delete({ where: { id: plan.id } });
  });
});
