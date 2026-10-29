import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LiveKitAdmin } from '../src/livekit/livekit-admin.js';
import { RoomService } from '../src/rooms/room-service.js';
import { buildApp } from '../src/app.js';

function makeApp(adminOverrides: Partial<LiveKitAdmin> = {}) {
  const admin: LiveKitAdmin = {
    createRoom: vi.fn(async () => undefined),
    getParticipantCount: vi.fn(async () => 0),
    createParticipantToken: vi.fn(async () => 'guest-token'),
    ...adminOverrides,
  };
  const app = buildApp({
    roomService: new RoomService(admin, { livekitUrl: 'wss://voice.example.test' }),
  });
  return { app, admin };
}

describe('room routes', () => {
  afterEach(() => vi.restoreAllMocks());

  it('creates a room and returns only its invite credential', async () => {
    const { app } = makeApp();
    const response = await app.inject({ method: 'POST', url: '/v1/rooms' });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ roomId: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/) });
    await app.close();
  });

  it('returns a token for a valid guest join', async () => {
    const { app } = makeApp();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/rooms/abcdefghijklmnopqrstuv/join',
      payload: { displayName: 'Ace' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      roomId: 'abcdefghijklmnopqrstuv',
      displayName: 'Ace',
      serverUrl: 'wss://voice.example.test',
      token: 'guest-token',
    });
    await app.close();
  });

  it('returns 400 for an invalid display name', async () => {
    const { app } = makeApp();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/rooms/abcdefghijklmnopqrstuv/join',
      payload: { displayName: '   ' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('invalid_input');
    await app.close();
  });

  it('maps a missing room to 404 and a full room to 409', async () => {
    const missing = makeApp({ getParticipantCount: vi.fn(async () => null) });
    const missingResponse = await missing.app.inject({
      method: 'POST',
      url: '/v1/rooms/abcdefghijklmnopqrstuv/join',
      payload: { displayName: 'Ace' },
    });
    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json().error.code).toBe('room_not_found');
    await missing.app.close();

    const full = makeApp({ getParticipantCount: vi.fn(async () => 4) });
    const fullResponse = await full.app.inject({
      method: 'POST',
      url: '/v1/rooms/abcdefghijklmnopqrstuv/join',
      payload: { displayName: 'Ace' },
    });
    expect(fullResponse.statusCode).toBe(409);
    expect(fullResponse.json().error.code).toBe('room_full');
    await full.app.close();
  });

  it('returns 503 when LiveKit cannot create the room', async () => {
    const { app } = makeApp({
      createRoom: vi.fn(async () => {
        throw new Error('upstream unavailable');
      }),
    });
    const response = await app.inject({ method: 'POST', url: '/v1/rooms' });

    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('livekit_unavailable');
    await app.close();
  });

  it('returns a healthy status without requiring LiveKit credentials', async () => {
    const { app } = makeApp();
    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
