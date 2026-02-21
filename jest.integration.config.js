const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['**/src/__tests__/api/**/*.test.ts'],
  globalSetup: '<rootDir>/src/__tests__/api/globalSetup.ts',
  // Increase timeout for DB operations
  testTimeout: 30000,
});
