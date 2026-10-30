import { Platform } from 'react-native';

import { CallForegroundService } from './call-foreground-service';

interface ForegroundServiceMock {
  register: jest.Mock;
  start: jest.Mock<Promise<void>, [parameters?: Record<string, unknown>]>;
  stop: jest.Mock<Promise<void>, []>;
  isRunning: jest.Mock;
}

jest.mock('@supersami/rn-foreground-service', () => ({
  __esModule: true,
  default: {
    register: jest.fn(),
    start: jest.fn(async () => undefined),
    stop: jest.fn(async () => undefined),
    isRunning: jest.fn(() => false),
  },
}));

function serviceMock(): ForegroundServiceMock {
  const resolved = jest.requireMock('@supersami/rn-foreground-service') as {
    default: ForegroundServiceMock;
  };
  return resolved.default;
}

const originalOS = Object.getOwnPropertyDescriptor(Platform, 'OS');

function setOS(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', {
    value: os,
    configurable: true,
  });
}

afterAll(() => {
  if (originalOS) {
    Object.defineProperty(Platform, 'OS', originalOS);
  }
});

describe('CallForegroundService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is a no-op on iOS', async () => {
    const service = serviceMock();
    setOS('ios');

    CallForegroundService.setup();
    await CallForegroundService.start();
    await CallForegroundService.stop();

    expect(service.register).not.toHaveBeenCalled();
    expect(service.start).not.toHaveBeenCalled();
    expect(service.stop).not.toHaveBeenCalled();
  });

  it('registers and starts the notification service on Android', async () => {
    const service = serviceMock();
    setOS('android');

    CallForegroundService.setup();
    await CallForegroundService.start({ microphoneGranted: true });

    expect(service.register).toHaveBeenCalledWith({
      config: expect.objectContaining({ alert: false }),
    });
    expect(service.start).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(Number),
        title: expect.stringContaining('voice'),
        ServiceType: 'microphone',
      }),
    );
  });

  it('stops the service after the room ends', async () => {
    const service = serviceMock();
    setOS('android');

    await CallForegroundService.stop();

    expect(service.stop).toHaveBeenCalledTimes(1);
  });
});
