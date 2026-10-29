import { randomBytes, randomUUID } from 'node:crypto';

import { JoinRoomRequestSchema, RoomIdSchema } from '@bgmi/contracts';

import type { ServerConfig } from '../config.js';
import type { LiveKitAdmin } from '../livekit/livekit-admin.js';

const MAX_PARTICIPANTS = 4 as const;
const EMPTY_TIMEOUT_SECONDS = 10 * 60;

export type RoomServiceErrorCode = 'room_not_found' | 'room_full' | 'livekit_unavailable';

export class RoomServiceError extends Error {
  constructor(
    readonly code: RoomServiceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'RoomServiceError';
  }
}

export class RoomService {
  constructor(
    private readonly livekit: LiveKitAdmin,
    private readonly config: Pick<ServerConfig, 'livekitUrl'>,
  ) {}

  async createRoom(): Promise<{ roomId: string }> {
    const roomId = randomBytes(16).toString('base64url');

    try {
      await this.livekit.createRoom(roomId, MAX_PARTICIPANTS, EMPTY_TIMEOUT_SECONDS);
    } catch (error) {
      throw new RoomServiceError('livekit_unavailable', 'Voice service is unavailable', { cause: error });
    }

    return { roomId };
  }

  async joinRoom(roomId: string, displayName: string) {
    const validatedRoomId = RoomIdSchema.parse(roomId);
    const guest = JoinRoomRequestSchema.parse({ displayName });
    let participantCount: number | null;

    try {
      participantCount = await this.livekit.getParticipantCount(validatedRoomId);
    } catch (error) {
      throw new RoomServiceError('livekit_unavailable', 'Voice service is unavailable', { cause: error });
    }

    if (participantCount === null) {
      throw new RoomServiceError('room_not_found', 'This invite is no longer active');
    }
    if (participantCount >= MAX_PARTICIPANTS) {
      throw new RoomServiceError('room_full', 'This room already has four players');
    }

    const participantIdentity = `guest-${randomUUID()}`;
    let token: string;
    try {
      token = await this.livekit.createParticipantToken(
        validatedRoomId,
        participantIdentity,
        guest.displayName,
      );
    } catch (error) {
      throw new RoomServiceError('livekit_unavailable', 'Voice service is unavailable', { cause: error });
    }

    return {
      roomId: validatedRoomId,
      displayName: guest.displayName,
      participantIdentity,
      serverUrl: this.config.livekitUrl,
      token,
    };
  }
}
