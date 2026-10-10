/**
 * Test Setup Configuration
 * 
 * This file configures the test environment for integration and E2E tests.
 * Loads test configuration only; it does not initialize or clean a database.
 */

import { resolve } from 'path';

import { config } from 'dotenv';

// Load test environment variables
config({ path: resolve(__dirname, '../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout (30 seconds for integration tests)
jest.setTimeout(30000);

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
