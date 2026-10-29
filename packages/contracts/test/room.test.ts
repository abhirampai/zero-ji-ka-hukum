import { describe, expect, it } from 'vitest';

import {
  CreateRoomResponseSchema,
  JoinRoomRequestSchema,
  JoinRoomResponseSchema,
  RoomIdSchema,
} from '../src/room';

const roomId = 'abcdefghijklmnopqrstuv';

describe('room API contracts', () => {
  it('trims a display name and accepts one through 24 characters', () => {
    expect(JoinRoomRequestSchema.parse({ displayName: '  Ace  ' })).toEqual({
      displayName: 'Ace',
    });
    expect(JoinRoomRequestSchema.safeParse({ displayName: 'a'.repeat(24) }).success).toBe(true);
  });

  it('rejects blank and overlong display names', () => {
    expect(JoinRoomRequestSchema.safeParse({ displayName: '   ' }).success).toBe(false);
    expect(JoinRoomRequestSchema.safeParse({ displayName: 'a'.repeat(25) }).success).toBe(false);
  });

  it('accepts only 22-character base64url room ids', () => {
    expect(RoomIdSchema.safeParse(roomId).success).toBe(true);
    expect(RoomIdSchema.safeParse('not-a-room').success).toBe(false);
  });

  it('requires a room id in a create response', () => {
    expect(CreateRoomResponseSchema.parse({ roomId })).toEqual({ roomId });
    expect(CreateRoomResponseSchema.safeParse({}).success).toBe(false);
  });

  it('requires every join credential field in a join response', () => {
    const response = {
      roomId,
      displayName: 'Ace',
      participantIdentity: 'guest-123',
      serverUrl: 'wss://voice.example.test',
      token: 'signed-room-token',
    };

    expect(JoinRoomResponseSchema.parse(response)).toEqual(response);
    expect(JoinRoomResponseSchema.safeParse({ ...response, token: undefined }).success).toBe(false);
  });
});
