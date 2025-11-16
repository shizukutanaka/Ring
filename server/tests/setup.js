/**
 * Jest Setup File
 * Global test configuration and utilities
 */

// Increase timeout for DB tests
jest.setTimeout(10000);

// Mock UUID for consistent testing
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234-5678-1234-567890abcdef'
}));

// Global test utilities
global.testUtils = {
  mockUser: (id = 'user-123') => ({
    id,
    username: `user-${id.slice(-3)}`,
    role: 'user'
  }),

  mockCall: (override = {}) => ({
    id: 'test-uuid-1234-5678-1234-567890abcdef',
    initiator: 'user-1',
    recipient: 'user-2',
    type: 'audio',
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...override
  }),

  mockConsent: (override = {}) => ({
    call_id: 'test-uuid-1234-5678-1234-567890abcdef',
    user_hash: 'user-123',
    consent_type: 'one_party',
    region_code: 'JP',
    timestamp: new Date().toISOString(),
    ...override
  })
};

// Suppress console output during tests
const originalError = console.error;
const originalLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
});
