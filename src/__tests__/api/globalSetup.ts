/**
 * Runs once before the integration test suite to migrate the test SQLite database.
 * Called from jest.integration.config.js as globalSetup.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export default async function globalSetup() {
  // Parse .env.test manually so DATABASE_URL is available for prisma
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

  // Migrate the test database (force-reset to ensure clean state)
  execSync('npx prisma db push --force-reset --skip-generate --accept-data-loss', {
    env: { ...process.env },
    stdio: 'inherit',
  });
}
