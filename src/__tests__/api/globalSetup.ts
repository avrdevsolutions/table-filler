/**
 * Runs once before the integration test suite to migrate the test PostgreSQL database.
 * Called from jest.integration.config.js as globalSetup.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export default async function globalSetup() {
  // Parse .env.test manually so DATABASE_URL is available for prisma
  // (only if DATABASE_URL is not already set by the environment, e.g. in CI)
  if (!process.env.DATABASE_URL) {
    const envTestPath = path.join(process.cwd(), '.env.test');
    if (fs.existsSync(envTestPath)) {
      const content = fs.readFileSync(envTestPath, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^([^=\s#][^=]*)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    }
  }

  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    throw new Error(
      `Invalid DATABASE_URL: "${dbUrl}". Must start with postgresql:// or postgres://.\n` +
        'Run docker compose up -d and ensure .env.test has the correct PostgreSQL URL.'
    );
  }

  // Push schema to the test database (creates tables if they don't exist)
  execSync('npx prisma db push --force-reset --skip-generate', {
    env: { ...process.env },
    stdio: 'inherit',
  });
}
