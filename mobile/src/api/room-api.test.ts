import * as Linking from 'expo-linking';
import {
  createInviteLink,
  RoomApi,
  RoomApiError,
} from './room-api';

jest.mock('expo-linking', () => {
  const actual = jest.requireActual<typeof import('expo-linking')>('expo-linking');
  return {
    ...actual,
    createURL: jest.fn(
      (path: string, options: { scheme: string }) => `${options.scheme}://${path.slice(1)}`,
    ),
  };
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('RoomApi', () => {
  it('creates a room using the versioned endpoint and validates the response', async () => {
    const fetcher = jest.fn(async () => jsonResponse(201, { roomId: 'abcdefghijklmnopqrstuv' }));
    const api = new RoomApi('https://voice-api.example.test/', fetcher);

    await expect(api.createRoom()).resolves.toEqual({ roomId: 'abcdefghijklmnopqrstuv' });
    expect(fetcher).toHaveBeenCalledWith('https://voice-api.example.test/v1/rooms', {
      method: 'POST',
    });
  });

  it('trims a guest name and sends the join payload as JSON', async () => {
    const response = {
      roomId: 'abcdefghijklmnopqrstuv',
      displayName: 'Ace',
      participantIdentity: 'guest-123',
      serverUrl: 'wss://voice.example.test',
      token: 'signed-token',
    };
    const fetcher = jest.fn(async () => jsonResponse(200, response));
    const api = new RoomApi('https://voice-api.example.test', fetcher);

    await expect(api.joinRoom('abcdefghijklmnopqrstuv', '  Ace  ')).resolves.toEqual(response);
    expect(fetcher).toHaveBeenCalledWith(
      'https://voice-api.example.test/v1/rooms/abcdefghijklmnopqrstuv/join',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: 'Ace' }),
      },
    );
  });

  it('maps API errors to safe typed messages instead of exposing server details', async () => {
    const fetcher = jest.fn(async () =>
      jsonResponse(503, {
        error: { code: 'livekit_unavailable', message: 'secret token must not be displayed' },
      }),
    );
    const api = new RoomApi('https://voice-api.example.test', fetcher);

    await expect(api.createRoom()).rejects.toMatchObject({
      name: 'RoomApiError',
      code: 'livekit_unavailable',
    });
    await api.createRoom().catch((error: RoomApiError) => {
      expect(error.message).not.toContain('secret token');
    });
  });

  it('builds the invite deep link with the app scheme and join route', () => {
    expect(createInviteLink('abcdefghijklmnopqrstuv')).toBe(
      'zero-ji-ka-hukum://join/abcdefghijklmnopqrstuv',
    );
    expect(Linking.createURL).toHaveBeenCalledWith('/join/abcdefghijklmnopqrstuv', {
      scheme: 'zero-ji-ka-hukum',
    });
  });
});
