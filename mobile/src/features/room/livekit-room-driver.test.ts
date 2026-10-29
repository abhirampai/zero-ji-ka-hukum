import { RoomEvent } from 'livekit-client';

import { NativeLiveKitRoomDriver } from './livekit-room-driver';

const mockAudioSession = {
  startAudioSession: jest.fn(async () => undefined),
  stopAudioSession: jest.fn(async () => undefined),
};

const mockRoomState: { current: any } = { current: undefined };

jest.mock('@livekit/react-native', () => ({
  AudioSession: {
    startAudioSession: () => mockAudioSession.startAudioSession(),
    stopAudioSession: () => mockAudioSession.stopAudioSession(),
  },
}));

jest.mock('livekit-client', () => ({
  Room: jest.fn(() => mockRoomState.current),
  RoomEvent: {
    Reconnecting: 'reconnecting',
    Reconnected: 'reconnected',
    Disconnected: 'disconnected',
    ParticipantConnected: 'participantConnected',
    ParticipantDisconnected: 'participantDisconnected',
    TrackSubscribed: 'trackSubscribed',
    TrackUnsubscribed: 'trackUnsubscribed',
    TrackMuted: 'trackMuted',
    TrackUnmuted: 'trackUnmuted',
    LocalTrackPublished: 'localTrackPublished',
    LocalTrackUnpublished: 'localTrackUnpublished',
  },
  Track: { Source: { Microphone: 'microphone' } },
}));

describe('NativeLiveKitRoomDriver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoomState.current = {
      localParticipant: {
        identity: 'guest-123',
        name: 'Ace',
        isMicrophoneEnabled: false,
        setMicrophoneEnabled: jest.fn(async () => undefined),
      },
      remoteParticipants: new Map(),
      connect: jest.fn(async () => undefined),
      disconnect: jest.fn(async () => undefined),
      on: jest.fn(),
      off: jest.fn(),
    };
  });

  it('starts the native audio session before connecting and stops it after disconnect', async () => {
    const order: string[] = [];
    mockAudioSession.startAudioSession.mockImplementation(async () => {
      order.push('audio-start');
    });
    mockRoomState.current.connect.mockImplementation(async () => {
      order.push('room-connect');
    });
    const driver = new NativeLiveKitRoomDriver();

    await driver.connect('wss://voice.example.test', 'signed-token');
    await driver.disconnect();

    expect(order).toEqual(['audio-start', 'room-connect']);
    expect(mockRoomState.current.disconnect).toHaveBeenCalledTimes(1);
    expect(mockAudioSession.stopAudioSession).toHaveBeenCalledTimes(1);
  });

  it('applies an individual remote audio gain only to the requested participant', () => {
    const firstGain = jest.fn();
    const secondGain = jest.fn();
    const participant = (identity: string, setVolume: jest.Mock) => ({
      identity,
      name: identity,
      isMicrophoneEnabled: true,
      audioTrackPublications: new Map([
        ['audio', { audioTrack: { mediaStreamTrack: { _setVolume: setVolume } } }],
      ]),
    });
    mockRoomState.current.remoteParticipants = new Map([
      ['guest-456', participant('guest-456', firstGain)],
      ['guest-789', participant('guest-789', secondGain)],
    ]);
    const driver = new NativeLiveKitRoomDriver();

    driver.setRemoteVolume('guest-456', 0.4);

    expect(firstGain).toHaveBeenCalledWith(0.4);
    expect(secondGain).not.toHaveBeenCalled();
  });

  it('emits a complete participant snapshot when room membership changes', () => {
    const driver = new NativeLiveKitRoomDriver();
    const listener = jest.fn();
    driver.subscribe(listener);
    const handler = mockRoomState.current.on.mock.calls.find(
      ([event]: [string]) => event === RoomEvent.ParticipantConnected,
    )?.[1];
    const remote = {
      identity: 'guest-456',
      name: 'Scout',
      isMicrophoneEnabled: true,
      audioTrackPublications: new Map(),
    };
    mockRoomState.current.remoteParticipants.set('guest-456', remote);

    handler?.(remote);

    expect(listener).toHaveBeenCalledWith({
      type: 'participants_changed',
      participants: [
        {
          identity: 'guest-123',
          displayName: 'Ace',
          isMicrophoneEnabled: false,
          isLocal: true,
        },
        {
          identity: 'guest-456',
          displayName: 'Scout',
          isMicrophoneEnabled: true,
          isLocal: false,
        },
      ],
    });
  });
});
