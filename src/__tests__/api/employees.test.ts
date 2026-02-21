import { getServerSession } from 'next-auth';
import { GET, POST } from '@/app/api/employees/route';
import { PUT, DELETE } from '@/app/api/employees/[id]/route';
import { testPrisma, createTestUser, cleanupUser, makeRequest, mockSession } from './helpers';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockedGetServerSession = getServerSession as jest.Mock;

let userId: string;
let email: string;
let bizId: string;

beforeAll(async () => {
  ({ userId, email } = await createTestUser('employees'));
  const biz = await testPrisma.business.create({
    data: { name: 'Emp Test Biz', locationName: 'Loc', ownerUserId: userId },
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

describe('GET /api/employees', () => {
  it('returns 401 when not authenticated', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);
    const req = makeRequest('http://localhost/api/employees');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns empty array when no employees exist', async () => {
    const req = makeRequest(`http://localhost/api/employees?businessId=${bizId}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
});

describe('POST /api/employees', () => {
  it('returns 400 when fullName is missing', async () => {
    const req = makeRequest('http://localhost/api/employees', {
      method: 'POST',
      body: { fullName: '', businessId: bizId },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('creates an employee and returns it', async () => {
    const req = makeRequest('http://localhost/api/employees', {
      method: 'POST',
      body: { fullName: 'Ion Popescu', businessId: bizId, startDate: '2024-01-15' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.fullName).toBe('Ion Popescu');
    expect(data.userId).toBe(userId);
    expect(data.businessId).toBe(bizId);
    expect(data.startDate).toBe('2024-01-15');
    await testPrisma.employee.delete({ where: { id: data.id } });
  });

  it('returns 404 when businessId belongs to another user', async () => {
    const { userId: otherId } = await createTestUser('emp-other');
    const otherBiz = await testPrisma.business.create({
      data: { name: 'Other', locationName: 'Loc', ownerUserId: otherId },
    });
    const req = makeRequest('http://localhost/api/employees', {
      method: 'POST',
      body: { fullName: 'Hacker', businessId: otherBiz.id },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    await testPrisma.user.delete({ where: { id: otherId } });
  });
});

describe('PUT /api/employees/[id]', () => {
  let empId: string;

  beforeAll(async () => {
    const emp = await testPrisma.employee.create({
      data: { fullName: 'Maria Test', userId, businessId: bizId },
    });
    empId = emp.id;
  });

  afterAll(async () => {
    await testPrisma.employee.deleteMany({ where: { id: empId } });
  });

  it('sets terminationDate and marks inactive', async () => {
    const req = makeRequest(`http://localhost/api/employees/${empId}`, {
      method: 'PUT',
      body: { terminationDate: '2024-06-30', active: false },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: empId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.terminationDate).toBe('2024-06-30');
    expect(data.active).toBe(false);
  });

  it('clears terminationDate and re-activates', async () => {
    const req = makeRequest(`http://localhost/api/employees/${empId}`, {
      method: 'PUT',
      body: { terminationDate: null, active: true },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: empId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.terminationDate).toBeNull();
    expect(data.active).toBe(true);
  });
});

describe('DELETE /api/employees/[id]', () => {
  it('soft-deletes (marks inactive) own employee', async () => {
    const emp = await testPrisma.employee.create({
      data: { fullName: 'ToBeSoftDeleted', userId, businessId: bizId },
    });
    const req = makeRequest(`http://localhost/api/employees/${emp.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: emp.id }) });
    expect(res.status).toBe(200);
    const updated = await testPrisma.employee.findUnique({ where: { id: emp.id } });
    expect(updated?.active).toBe(false);
    await testPrisma.employee.delete({ where: { id: emp.id } });
  });

  it("returns 404 when deleting another user's employee", async () => {
    const { userId: otherId } = await createTestUser('emp-del-other');
    const otherEmp = await testPrisma.employee.create({
      data: { fullName: 'Other Emp', userId: otherId },
    });
    const req = makeRequest(`http://localhost/api/employees/${otherEmp.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: otherEmp.id }) });
    expect(res.status).toBe(404);
    await testPrisma.user.delete({ where: { id: otherId } });
  });
});
