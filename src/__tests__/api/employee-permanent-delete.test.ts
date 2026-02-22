import { getServerSession } from 'next-auth';
import { DELETE } from '@/app/api/businesses/[id]/employees/[employeeId]/route';
import { testPrisma, createTestUser, cleanupUser, makeRequest, mockSession } from './helpers';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockedGetServerSession = getServerSession as jest.Mock;

let userId: string;
let email: string;
let bizId: string;

beforeAll(async () => {
  ({ userId, email } = await createTestUser('perm-del'));
  const biz = await testPrisma.business.create({
    data: { name: 'Perm Del Biz', locationName: 'Loc', ownerUserId: userId },
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

describe('DELETE /api/businesses/[id]/employees/[employeeId]', () => {
  it('returns 401 when not authenticated', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);
    const req = makeRequest(`http://localhost/api/businesses/${bizId}/employees/fake`, {
      method: 'DELETE',
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: bizId, employeeId: 'fake' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when employee does not exist', async () => {
    const req = makeRequest(`http://localhost/api/businesses/${bizId}/employees/nonexistent`, {
      method: 'DELETE',
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: bizId, employeeId: 'nonexistent' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when employee belongs to another user', async () => {
    const { userId: otherId } = await createTestUser('perm-del-other');
    const otherEmp = await testPrisma.employee.create({
      data: { fullName: 'Other', userId: otherId, businessId: bizId },
    });
    const req = makeRequest(
      `http://localhost/api/businesses/${bizId}/employees/${otherEmp.id}`,
      { method: 'DELETE' }
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: bizId, employeeId: otherEmp.id }),
    });
    expect(res.status).toBe(404);
    await testPrisma.user.delete({ where: { id: otherId } });
  });

  it('permanently deletes employee, cells, and removes from month plan employeeIds', async () => {
    // Create a second employee that should be unaffected
    const other = await testPrisma.employee.create({
      data: { fullName: 'Other Employee', userId, businessId: bizId },
    });

    // Create the employee to delete
    const emp = await testPrisma.employee.create({
      data: { fullName: 'To Be Deleted', userId, businessId: bizId },
    });

    // Create a month plan that includes both employees
    const plan = await testPrisma.monthPlan.create({
      data: {
        month: 3,
        year: 2025,
        userId,
        businessId: bizId,
        employeeIds: JSON.stringify([emp.id, other.id]),
      },
    });

    // Create cells for both employees
    await testPrisma.cell.create({
      data: { monthPlanId: plan.id, employeeId: emp.id, day: 1, value: 'ZL' },
    });
    await testPrisma.cell.create({
      data: { monthPlanId: plan.id, employeeId: other.id, day: 1, value: 'ZL' },
    });

    const req = makeRequest(
      `http://localhost/api/businesses/${bizId}/employees/${emp.id}`,
      { method: 'DELETE' }
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: bizId, employeeId: emp.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Employee is gone
    const deleted = await testPrisma.employee.findUnique({ where: { id: emp.id } });
    expect(deleted).toBeNull();

    // Cells for deleted employee are gone
    const cells = await testPrisma.cell.findMany({ where: { employeeId: emp.id } });
    expect(cells).toHaveLength(0);

    // Other employee's cells are unaffected
    const otherCells = await testPrisma.cell.findMany({ where: { employeeId: other.id } });
    expect(otherCells).toHaveLength(1);

    // Month plan no longer includes deleted employee in employeeIds
    const updatedPlan = await testPrisma.monthPlan.findUnique({ where: { id: plan.id } });
    const ids: string[] = JSON.parse(updatedPlan!.employeeIds);
    expect(ids).not.toContain(emp.id);
    expect(ids).toContain(other.id);

    // Other employee is unaffected
    const otherEmp = await testPrisma.employee.findUnique({ where: { id: other.id } });
    expect(otherEmp).not.toBeNull();

    // Cleanup
    await testPrisma.employee.delete({ where: { id: other.id } });
    await testPrisma.monthPlan.delete({ where: { id: plan.id } });
  });

  it('returns 404 when employee belongs to a different business', async () => {
    const otherBiz = await testPrisma.business.create({
      data: { name: 'Other Biz', locationName: 'Loc', ownerUserId: userId },
    });
    const emp = await testPrisma.employee.create({
      data: { fullName: 'Wrong Biz Employee', userId, businessId: otherBiz.id },
    });
    const req = makeRequest(
      `http://localhost/api/businesses/${bizId}/employees/${emp.id}`,
      { method: 'DELETE' }
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: bizId, employeeId: emp.id }),
    });
    expect(res.status).toBe(404);
    await testPrisma.employee.delete({ where: { id: emp.id } });
    await testPrisma.business.delete({ where: { id: otherBiz.id } });
  });
});
