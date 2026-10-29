import * as Linking from 'expo-linking';
import type { CreateRoomResponse, JoinRoomResponse } from '@bgmi/contracts';
import {
  ApiErrorResponseSchema,
  CreateRoomResponseSchema,
  JoinRoomRequestSchema,
  JoinRoomResponseSchema,
  RoomIdSchema,
} from '@bgmi/contracts/room';

export type RoomApiErrorCode =
  | 'configuration_error'
  | 'invalid_input'
  | 'invalid_response'
  | 'livekit_unavailable'
  | 'network_error'
  | 'room_full'
  | 'room_not_found'
  | 'server_error';

const APP_SCHEME = 'zero-ji-ka-hukum';

const USER_MESSAGES: Record<RoomApiErrorCode, string> = {
  configuration_error: 'The voice server is not configured yet.',
  invalid_input: 'Check the room invite and display name, then try again.',
  invalid_response: 'The server returned an unexpected response. Try again.',
  livekit_unavailable: 'Voice chat is temporarily unavailable. Try again in a moment.',
  network_error: 'Could not reach the voice server. Check your connection and try again.',
  room_full: 'This room already has four players.',
  room_not_found: 'This invite is no longer active. Ask your friend for a new one.',
  server_error: 'Something went wrong. Try again in a moment.',
};

export class RoomApiError extends Error {
  constructor(
    readonly code: RoomApiErrorCode,
    readonly status?: number,
  ) {
    super(USER_MESSAGES[code]);
    this.name = 'RoomApiError';
  }
}

export class RoomApi {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly fetcher: typeof fetch = fetch) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async createRoom(): Promise<CreateRoomResponse> {
    const body = await this.request('/v1/rooms', { method: 'POST' });
    const parsed = CreateRoomResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new RoomApiError('invalid_response');
    }
    return parsed.data;
  }

  async joinRoom(roomId: string, displayName: string): Promise<JoinRoomResponse> {
    const parsedRoomId = RoomIdSchema.safeParse(roomId);
    const parsedGuest = JoinRoomRequestSchema.safeParse({ displayName });
    if (!parsedRoomId.success || !parsedGuest.success) {
      throw new RoomApiError('invalid_input');
    }

    const body = await this.request(`/v1/rooms/${encodeURIComponent(parsedRoomId.data)}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsedGuest.data),
    });
    const parsed = JoinRoomResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new RoomApiError('invalid_response');
    }
    return parsed.data;
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, init);
    } catch {
      throw new RoomApiError('network_error');
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new RoomApiError('invalid_response', response.status);
    }

    if (!response.ok) {
      const parsedError = ApiErrorResponseSchema.safeParse(body);
      const code = parsedError.success ? parsedError.data.error.code : 'server_error';
      const apiCode: RoomApiErrorCode =
        code === 'room_full' || code === 'room_not_found' || code === 'livekit_unavailable'
          ? code
          : code === 'invalid_input'
            ? code
            : 'server_error';
      throw new RoomApiError(apiCode, response.status);
    }

    return body;
  }
}

export function createInviteLink(roomId: string): string {
  const parsed = RoomIdSchema.safeParse(roomId);
  if (!parsed.success) {
    throw new RoomApiError('invalid_input');
  }

  return Linking.createURL(`/join/${parsed.data}`, { scheme: APP_SCHEME });
}

export function createDefaultRoomApi(): RoomApi {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new RoomApiError('configuration_error');
  }
  return new RoomApi(baseUrl);
}
