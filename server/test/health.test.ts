import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../src/app.js';
import type { LiveKitAdmin } from '../src/livekit/livekit-admin.js';
import { RoomService } from '../src/rooms/room-service.js';

function makeApp() {
  const admin: LiveKitAdmin = {
    createRoom: vi.fn(async () => undefined),
    getParticipantCount: vi.fn(async () => 0),
    createParticipantToken: vi.fn(async () => 'guest-token'),
  };
  const app = buildApp({
    roomService: new RoomService(admin, { livekitUrl: 'wss://voice.example.test' }),
  });
  return { app, admin };
}

describe('health route', () => {
  it('returns ok for liveness checks without touching LiveKit', async () => {
    const { app, admin } = makeApp();

    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expect(admin.getParticipantCount).not.toHaveBeenCalled();
    await app.close();
  });
});
