import { AndroidAudioTypePresets, AudioSession } from '@livekit/react-native';
import { Room, RoomEvent } from 'livekit-client';

import type {
  LiveKitRoomDriver,
  RoomDriverEvent,
  RoomParticipant,
} from './room-connection';

const PARTICIPANT_EVENTS = [
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
  RoomEvent.TrackSubscribed,
  RoomEvent.TrackUnsubscribed,
  RoomEvent.TrackMuted,
  RoomEvent.TrackUnmuted,
  RoomEvent.LocalTrackPublished,
  RoomEvent.LocalTrackUnpublished,
] as const;

export class NativeLiveKitRoomDriver implements LiveKitRoomDriver {
  private readonly listeners = new Set<(event: RoomDriverEvent) => void>();
  private readonly remoteVolumes = new Map<string, number>();
  private audioSessionStarted = false;

  constructor(private readonly room: Room = new Room()) {
    this.room.on(RoomEvent.Reconnecting, this.onReconnecting);
    this.room.on(RoomEvent.Reconnected, this.onReconnected);
    this.room.on(RoomEvent.Disconnected, this.onDisconnected);
    for (const event of PARTICIPANT_EVENTS) {
      this.room.on(event, this.onParticipantsChanged);
    }
  }

  subscribe(listener: (event: RoomDriverEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async connect(serverUrl: string, token: string): Promise<void> {
    // media audio mode keeps BGMI's own volume healthy while squad audio plays.
    await AudioSession.configureAudio({
      android: { audioTypeOptions: AndroidAudioTypePresets.media },
    });
    await AudioSession.startAudioSession();
    this.audioSessionStarted = true;
    try {
      await this.room.connect(serverUrl, token);
      this.emitParticipantsChanged();
    } catch (error) {
      await this.stopAudioSession();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.room.disconnect();
    } finally {
      await this.stopAudioSession();
    }
  }

  setMicrophoneEnabled(enabled: boolean): Promise<void> {
    return this.room.localParticipant.setMicrophoneEnabled(enabled).then(() => undefined);
  }

  setRemoteVolume(participantIdentity: string, volume: number): void {
    this.remoteVolumes.set(participantIdentity, volume);
    this.applyRemoteVolume(participantIdentity, volume);
  }

  async listAudioInputDevices(): Promise<{ deviceId: string; label: string }[]> {
    const collect = async (enumerator?: () => Promise<{ kind: string; deviceId: string; label?: string }[]>) => {
      if (typeof enumerator !== 'function') {
        return [] as { deviceId: string; label: string }[];
      }
      try {
        const devices = await enumerator();
        if (!Array.isArray(devices)) {
          return [] as { deviceId: string; label: string }[];
        }
        return devices
          .filter((device) => device.kind === 'audioinput')
          .map((device, index) => ({
            deviceId: device.deviceId || `default-${index}`,
            label: device.label || `Microphone ${index + 1}`,
          }));
      } catch {
        return [] as { deviceId: string; label: string }[];
      }
    };

    let result: { deviceId: string; label: string }[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const webrtc = require('@livekit/react-native-webrtc') as {
        mediaDevices?: { enumerateDevices: () => Promise<{ kind: string; deviceId: string; label?: string }[]> };
      };
      result = await collect(webrtc.mediaDevices?.enumerateDevices?.bind(webrtc.mediaDevices));
    } catch {
      result = [];
    }

    if (result.length === 0 && typeof navigator !== 'undefined') {
      const nav = navigator as { mediaDevices?: { enumerateDevices?: () => Promise<{ kind: string; deviceId: string; label?: string }[]> } };
      if (nav.mediaDevices?.enumerateDevices) {
        result = await collect(nav.mediaDevices.enumerateDevices.bind(nav.mediaDevices));
      }
    }

    if (result.length === 0) {
      result = [{ deviceId: 'default', label: 'Default microphone' }];
    }

    return result;
  }

  async setAudioInputDevice(deviceId: string): Promise<void> {
    if (!deviceId || deviceId === 'default') {
      return;
    }
    try {
      await this.room.switchActiveDevice('audioinput', deviceId);
    } catch {
      // Switching inputs is best-effort; keep the current device.
    }
  }

  private readonly onReconnecting = () => this.emit({ type: 'reconnecting' });
  private readonly onReconnected = () => this.emit({ type: 'reconnected' });
  private readonly onDisconnected = () => this.emit({ type: 'disconnected' });
  private readonly onParticipantsChanged = () => this.emitParticipantsChanged();

  private emitParticipantsChanged() {
    const local = this.room.localParticipant;
    const participants: RoomParticipant[] = [
      {
        identity: local.identity,
        displayName: local.name || 'You',
        isMicrophoneEnabled: local.isMicrophoneEnabled,
        isLocal: true,
      },
    ];

    for (const participant of this.room.remoteParticipants.values()) {
      participants.push({
        identity: participant.identity,
        displayName: participant.name || 'Player',
        isMicrophoneEnabled: participant.isMicrophoneEnabled,
        isLocal: false,
      });
      const volume = this.remoteVolumes.get(participant.identity);
      if (volume !== undefined) {
        this.applyRemoteVolume(participant.identity, volume);
      }
    }

    this.emit({ type: 'participants_changed', participants });
  }

  private applyRemoteVolume(participantIdentity: string, volume: number) {
    const participant = this.room.remoteParticipants.get(participantIdentity) as
      | { setVolume?: (volume: number) => void; audioTrackPublications?: Map<string, { audioTrack?: { mediaStreamTrack?: { _setVolume?: (volume: number) => void } } }> }
      | undefined;
    if (!participant) {
      return;
    }

    try {
      participant.setVolume?.(volume);
    } catch {
      // Fall through to track-level volume.
    }

    if (participant.audioTrackPublications) {
      for (const publication of participant.audioTrackPublications.values()) {
        const track = publication.audioTrack?.mediaStreamTrack as
          | (MediaStreamTrack & { _setVolume?: (volume: number) => void })
          | undefined;
        track?._setVolume?.(volume);
      }
    }
  }

  private emit(event: RoomDriverEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private async stopAudioSession() {
    if (!this.audioSessionStarted) {
      return;
    }
    this.audioSessionStarted = false;
    await AudioSession.stopAudioSession();
  }
}
