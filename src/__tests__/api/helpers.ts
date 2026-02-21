/**
 * Shared helpers for API integration tests.
 *
 * Each test file should call createTestUser() in beforeAll to get a userId
 * and configure the getServerSession mock to return that user.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/** Prisma client that uses the test DATABASE_URL (loaded by next/jest from .env.test) */
export const testPrisma = new PrismaClient();

/**
 * Creates a fresh test user in the test database and returns its id.
 * Uses a unique email based on the provided suffix to avoid conflicts.
 */
export async function createTestUser(suffix = 'default'): Promise<{ userId: string; email: string }> {
  const email = `test-${suffix}-${Date.now()}@test.com`;
  const password = await bcrypt.hash('password123', 10);
  const user = await testPrisma.user.create({
    data: { email, password, name: `Test ${suffix}` },
  });
  return { userId: user.id, email };
}

/**
 * Removes all data for a given userId (businesses, employees, plans, cells are
 * cascade-deleted when the user is deleted).
 */
export async function cleanupUser(userId: string) {
  await testPrisma.user.deleteMany({ where: { id: userId } });
}

/**
 * Creates a minimal mock Request for route handler testing.
 */
export function makeRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): Request {
  const { method = 'GET', body } = options;
  return new Request(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Standard mock session returned by the mocked getServerSession */
export function mockSession(userId: string, email: string) {
  return {
    user: { id: userId, email, name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
