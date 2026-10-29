import { TokenVerifier } from 'livekit-server-sdk';
import { describe, expect, it, vi } from 'vitest';

import type { LiveKitAdmin } from '../src/livekit/livekit-admin.js';
import { LiveKitCloudAdmin } from '../src/livekit/livekit-admin.js';
import { RoomService } from '../src/rooms/room-service.js';

function makeAdmin(overrides: Partial<LiveKitAdmin> = {}) {
  const admin: LiveKitAdmin = {
    createRoom: vi.fn(async () => undefined),
    getParticipantCount: vi.fn(async () => 0),
    createParticipantToken: vi.fn(async () => 'guest-token'),
    ...overrides,
  };
  return admin;
}

describe('RoomService', () => {
  it('creates a 128-bit URL-safe invite room capped at four for ten minutes', async () => {
    const admin = makeAdmin();
    const service = new RoomService(admin, { livekitUrl: 'wss://voice.example.test' });

    const result = await service.createRoom();

    expect(result.roomId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(admin.createRoom).toHaveBeenCalledWith(result.roomId, 4, 600);
  });

  it('returns a short-lived audio-only guest credential', async () => {
    const admin = makeAdmin();
    const service = new RoomService(admin, { livekitUrl: 'wss://voice.example.test' });

    const result = await service.joinRoom('abcdefghijklmnopqrstuv', '  Ace  ');

    expect(result).toMatchObject({
      roomId: 'abcdefghijklmnopqrstuv',
      displayName: 'Ace',
      serverUrl: 'wss://voice.example.test',
      token: 'guest-token',
    });
    expect(result.participantIdentity).toMatch(/^guest-/);
    expect(admin.createParticipantToken).toHaveBeenCalledWith(
      'abcdefghijklmnopqrstuv',
      result.participantIdentity,
      'Ace',
    );
  });

  it('rejects a full room without issuing a token', async () => {
    const admin = makeAdmin({ getParticipantCount: vi.fn(async () => 4) });
    const service = new RoomService(admin, { livekitUrl: 'wss://voice.example.test' });

    await expect(service.joinRoom('abcdefghijklmnopqrstuv', 'Ace')).rejects.toMatchObject({
      code: 'room_full',
    });
    expect(admin.createParticipantToken).not.toHaveBeenCalled();
  });

  it('rejects an unknown room without issuing a token', async () => {
    const admin = makeAdmin({ getParticipantCount: vi.fn(async () => null) });
    const service = new RoomService(admin, { livekitUrl: 'wss://voice.example.test' });

    await expect(service.joinRoom('abcdefghijklmnopqrstuv', 'Ace')).rejects.toMatchObject({
      code: 'room_not_found',
    });
    expect(admin.createParticipantToken).not.toHaveBeenCalled();
  });
});

describe('LiveKitCloudAdmin guest grants', () => {
  it('allows microphone publish and subscription but not camera or data publish', async () => {
    const admin = new LiveKitCloudAdmin({
      livekitUrl: 'wss://voice.example.test',
      livekitApiKey: 'test-key',
      livekitApiSecret: 'test-secret-at-least-32-characters',
    });

    const token = await admin.createParticipantToken('room-one', 'guest-one', 'Ace');
    const grants = await new TokenVerifier('test-key', 'test-secret-at-least-32-characters').verify(
      token,
    );

    expect(grants.video).toMatchObject({
      room: 'room-one',
      roomJoin: true,
      canPublish: true,
      canPublishSources: ['microphone'],
      canSubscribe: true,
      canPublishData: false,
    });
    expect(grants.video?.canPublishSources).not.toContain('camera');
  });
});
