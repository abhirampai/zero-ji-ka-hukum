import { AccessToken, LiveKitAPI, TrackSource } from 'livekit-server-sdk';

import type { ServerConfig } from '../config.js';

export interface LiveKitAdmin {
  createRoom(roomName: string, maxParticipants: 4, emptyTimeoutSeconds: number): Promise<void>;
  getParticipantCount(roomName: string): Promise<number | null>;
  createParticipantToken(roomName: string, identity: string, displayName: string): Promise<string>;
}

export class LiveKitCloudAdmin implements LiveKitAdmin {
  private readonly api: LiveKitAPI;

  constructor(private readonly config: Pick<ServerConfig, 'livekitUrl' | 'livekitApiKey' | 'livekitApiSecret'>) {
    const apiUrl = new URL(config.livekitUrl);
    apiUrl.protocol = 'https:';
    this.api = new LiveKitAPI({
      host: apiUrl.toString(),
      apiKey: config.livekitApiKey,
      secret: config.livekitApiSecret,
    });
  }

  async createRoom(
    roomName: string,
    maxParticipants: 4,
    emptyTimeoutSeconds: number,
  ): Promise<void> {
    await this.api.room.createRoom({
      name: roomName,
      maxParticipants,
      emptyTimeout: emptyTimeoutSeconds,
    });
  }

  async getParticipantCount(roomName: string): Promise<number | null> {
    const rooms = await this.api.room.listRooms([roomName]);
    if (rooms.length === 0) {
      return null;
    }

    const participants = await this.api.room.listParticipants(roomName);
    return participants.length;
  }

  async createParticipantToken(
    roomName: string,
    identity: string,
    displayName: string,
  ): Promise<string> {
    const token = new AccessToken(this.config.livekitApiKey, this.config.livekitApiSecret, {
      identity,
      name: displayName,
      ttl: '10m',
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE],
      canSubscribe: true,
      canPublishData: false,
    });

    return token.toJwt();
  }
}
