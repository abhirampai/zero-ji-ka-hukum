import type { JoinRoomResponse } from '@bgmi/contracts';

import { applyMicrophonePermission } from './RoomState';
import { CallForegroundService } from '../../platform/call-foreground-service';

export type RoomConnectionErrorCode =
  | 'room_full'
  | 'microphone_permission_denied'
  | 'connection_failed';

/** Keeps voice alive in the background; no-op off Android. */
export interface ForegroundServiceLike {
  start(options?: { microphoneGranted: boolean }): Promise<void>;
  stop(): Promise<void>;
}

export interface RoomParticipant {
  identity: string;
  displayName: string;
  isMicrophoneEnabled: boolean;
  isLocal: boolean;
}

export interface RoomConnectionSnapshot {
  state: import('./RoomState').RoomState;
  participants: RoomParticipant[];
  localMicrophoneEnabled: boolean;
  errorCode?: RoomConnectionErrorCode;
}

export type RoomDriverEvent =
  | { type: 'participants_changed'; participants: RoomParticipant[] }
  | { type: 'reconnecting' }
  | { type: 'reconnected' }
  | { type: 'disconnected' };

export interface LiveKitRoomDriver {
  connect(serverUrl: string, token: string): Promise<void>;
  disconnect(): Promise<void>;
  setMicrophoneEnabled(enabled: boolean): Promise<void>;
  setRemoteVolume(participantIdentity: string, volume: number): void;
  listAudioInputDevices(): Promise<{ deviceId: string; label: string }[]>;
  setAudioInputDevice(deviceId: string): Promise<void>;
  subscribe(listener: (event: RoomDriverEvent) => void): () => void;
}

const ROOM_CONNECTION_MESSAGES: Record<RoomConnectionErrorCode, string> = {
  room_full: 'This room already has four players.',
  microphone_permission_denied: 'Microphone access is off. You can still listen, or enable it in Settings.',
  connection_failed: 'Could not connect to voice chat. Check your connection and try again.',
};

export class RoomConnectionError extends Error {
  constructor(readonly code: RoomConnectionErrorCode, options?: ErrorOptions) {
    super(ROOM_CONNECTION_MESSAGES[code], options);
    this.name = 'RoomConnectionError';
  }
}

const initialSnapshot = (): RoomConnectionSnapshot => ({
  state: 'idle',
  participants: [],
  localMicrophoneEnabled: false,
});

function isMicrophonePermissionError(error: unknown): boolean {
  const candidate = error as { message?: string; name?: string } | null;
  const message = candidate?.message?.toLowerCase() ?? '';
  return candidate?.name === 'NotAllowedError' || /microphone|permission|denied/.test(message);
}

function isRoomFullError(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string } | null;
  const message = candidate?.message?.toLowerCase() ?? '';
  return candidate?.code === 'room_full' || /room(?: is)? full|max(?:imum)? participants|participant limit/.test(message);
}

export class RoomConnection {
  private snapshot: RoomConnectionSnapshot = initialSnapshot();
  private readonly listeners = new Set<(snapshot: RoomConnectionSnapshot) => void>();
  private readonly unsubscribeDriver: () => void;
  private foregroundServiceRunning = false;

  constructor(
    private readonly driver: LiveKitRoomDriver,
    private readonly foregroundService: ForegroundServiceLike = CallForegroundService,
  ) {
    this.unsubscribeDriver = driver.subscribe((event) => this.handleDriverEvent(event));
  }

  getSnapshot(): RoomConnectionSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: RoomConnectionSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async connect(credentials: JoinRoomResponse): Promise<void> {
    this.update({ state: 'joining', errorCode: undefined, participants: [] });

    try {
      await this.driver.connect(credentials.serverUrl, credentials.token);
      this.update({ state: 'connected', errorCode: undefined });
      await this.setMicrophoneEnabled(true);
      await this.startForegroundService();
    } catch (error) {
      const code = isRoomFullError(error) ? 'room_full' : 'connection_failed';
      this.update({ state: 'error', errorCode: code, localMicrophoneEnabled: false });
      throw new RoomConnectionError(code, { cause: error });
    }
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    try {
      await this.driver.setMicrophoneEnabled(enabled);
      this.update({
        state: applyMicrophonePermission(this.snapshot.state, true),
        localMicrophoneEnabled: enabled,
        errorCode: undefined,
      });
      if (this.foregroundServiceRunning) {
        await this.startForegroundService();
      }
    } catch (error) {
      if (enabled && isMicrophonePermissionError(error)) {
        this.update({
          state: applyMicrophonePermission(this.snapshot.state, false),
          localMicrophoneEnabled: false,
          errorCode: 'microphone_permission_denied',
        });
        return;
      }
      throw new RoomConnectionError('connection_failed', { cause: error });
    }
  }

  setRemoteVolume(participantIdentity: string, volume: number): void {
    const normalizedVolume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;
    this.driver.setRemoteVolume(participantIdentity, normalizedVolume);
  }

  async listAudioInputDevices(): Promise<{ deviceId: string; label: string }[]> {
    try {
      return await this.driver.listAudioInputDevices();
    } catch {
      return [];
    }
  }

  async setAudioInputDevice(deviceId: string): Promise<void> {
    await this.driver.setAudioInputDevice(deviceId);
  }

  // Convenience aliases used by some callers.
  async getAudioInputDevices(): Promise<{ deviceId: string; label: string }[]> {
    return this.listAudioInputDevices();
  }

  async setMicrophoneDevice(deviceId: string): Promise<void> {
    return this.setAudioInputDevice(deviceId);
  }

  async switchMicrophone(deviceId: string): Promise<void> {
    return this.setAudioInputDevice(deviceId);
  }

  muteParticipant(participantIdentity: string, muted: boolean): void {
    this.setRemoteVolume(participantIdentity, muted ? 0 : 1);
  }

  setParticipantMuted(participantIdentity: string, muted: boolean): void {
    this.muteParticipant(participantIdentity, muted);
  }

  async disconnect(): Promise<void> {
    try {
      await this.driver.disconnect();
    } finally {
      this.foregroundServiceRunning = false;
      await this.foregroundService.stop();
      this.update({ ...initialSnapshot(), errorCode: undefined });
    }
  }

  dispose(): void {
    this.unsubscribeDriver();
    this.listeners.clear();
  }

  private handleDriverEvent(event: RoomDriverEvent) {
    switch (event.type) {
      case 'participants_changed':
        this.update({ participants: event.participants });
        break;
      case 'reconnecting':
        this.update({ state: 'reconnecting' });
        break;
      case 'reconnected':
        this.update({
          state:
            this.snapshot.errorCode === 'microphone_permission_denied'
              ? 'connected_receive_only'
              : 'connected',
        });
        break;
      case 'disconnected':
        this.update({ state: 'error', errorCode: 'connection_failed' });
        this.foregroundServiceRunning = false;
        void this.foregroundService.stop();
        break;
    }
  }

  private update(patch: Partial<RoomConnectionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }

  private async startForegroundService(): Promise<void> {
    this.foregroundServiceRunning = true;
    try {
      await this.foregroundService.start({
        microphoneGranted: this.snapshot.localMicrophoneEnabled,
      });
    } catch {
      // The ongoing Android notification must never block the voice session.
    }
  }
}
