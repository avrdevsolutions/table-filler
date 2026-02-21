import { getServerSession } from 'next-auth';
import { GET, POST } from '@/app/api/businesses/route';
import { PUT, DELETE } from '@/app/api/businesses/[id]/route';
import { testPrisma, createTestUser, cleanupUser, makeRequest, mockSession } from './helpers';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockedGetServerSession = getServerSession as jest.Mock;

let userId: string;
let email: string;

beforeAll(async () => {
  ({ userId, email } = await createTestUser('businesses'));
});

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue(mockSession(userId, email));
});

afterAll(async () => {
  await cleanupUser(userId);
  await testPrisma.$disconnect();
});

describe('GET /api/businesses', () => {
  it('returns 401 when not authenticated', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);
    const req = makeRequest('http://localhost/api/businesses');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns empty array when user has no businesses', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('POST /api/businesses', () => {
  it('returns 401 when not authenticated', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);
    const req = makeRequest('http://localhost/api/businesses', {
      method: 'POST',
      body: { name: 'Test', locationName: 'Loc' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const req = makeRequest('http://localhost/api/businesses', {
      method: 'POST',
      body: { name: '', locationName: 'Loc' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when locationName is missing', async () => {
    const req = makeRequest('http://localhost/api/businesses', {
      method: 'POST',
      body: { name: 'My Business', locationName: '' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('creates a business and returns it', async () => {
    const req = makeRequest('http://localhost/api/businesses', {
      method: 'POST',
      body: { name: 'Firma Test', locationName: 'Locatie Test' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Firma Test');
    expect(data.locationName).toBe('Locatie Test');
    expect(data.ownerUserId).toBe(userId);
    // cleanup
    await testPrisma.business.delete({ where: { id: data.id } });
  });
});

describe('PUT /api/businesses/[id]', () => {
  let bizId: string;

  beforeAll(async () => {
    const biz = await testPrisma.business.create({
      data: { name: 'Orig', locationName: 'Orig Loc', ownerUserId: userId },
    });
    bizId = biz.id;
  });

  afterAll(async () => {
    await testPrisma.business.deleteMany({ where: { id: bizId } });
  });

  it('updates business name and location', async () => {
    const req = makeRequest(`http://localhost/api/businesses/${bizId}`, {
      method: 'PUT',
      body: { name: 'Updated', locationName: 'New Loc' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: bizId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Updated');
    expect(data.locationName).toBe('New Loc');
  });

  it('returns 404 for another user\'s business', async () => {
    const { userId: otherUserId } = await createTestUser('other-biz');
    const otherBiz = await testPrisma.business.create({
      data: { name: 'Other', locationName: 'Other Loc', ownerUserId: otherUserId },
    });
    const req = makeRequest(`http://localhost/api/businesses/${otherBiz.id}`, {
      method: 'PUT',
      body: { name: 'Hacked' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: otherBiz.id }) });
    expect(res.status).toBe(404);
    await testPrisma.user.delete({ where: { id: otherUserId } });
  });
});

describe('DELETE /api/businesses/[id]', () => {
  it('deletes own business', async () => {
    const biz = await testPrisma.business.create({
      data: { name: 'ToDelete', locationName: 'Loc', ownerUserId: userId },
    });
    const req = makeRequest(`http://localhost/api/businesses/${biz.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: biz.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    const check = await testPrisma.business.findUnique({ where: { id: biz.id } });
    expect(check).toBeNull();
  });

  it('returns 404 when deleting another user\'s business', async () => {
    const { userId: otherUserId } = await createTestUser('other-del');
    const otherBiz = await testPrisma.business.create({
      data: { name: 'OtherDel', locationName: 'Loc', ownerUserId: otherUserId },
    });
    const req = makeRequest(`http://localhost/api/businesses/${otherBiz.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: otherBiz.id }) });
    expect(res.status).toBe(404);
    await testPrisma.user.delete({ where: { id: otherUserId } });
  });
});
