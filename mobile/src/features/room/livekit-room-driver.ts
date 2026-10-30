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
    const participant = this.room.remoteParticipants.get(participantIdentity);
    if (!participant) {
      return;
    }

    for (const publication of participant.audioTrackPublications.values()) {
      const track = publication.audioTrack?.mediaStreamTrack as
        | (MediaStreamTrack & { _setVolume?: (volume: number) => void })
        | undefined;
      track?._setVolume?.(volume);
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
