// Global Jest setup: stub native-only modules before any test imports them.
jest.mock('@supersami/rn-foreground-service', () => ({
  __esModule: true,
  default: {
    register: jest.fn(),
    start: jest.fn(async () => undefined),
    stop: jest.fn(async () => undefined),
    isRunning: jest.fn(() => false),
  },
}));
