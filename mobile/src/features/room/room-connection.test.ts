import type { JoinRoomResponse } from '@bgmi/contracts';

import {
  RoomConnection,
  RoomConnectionError,
  type LiveKitRoomDriver,
  type RoomDriverEvent,
  type RoomParticipant,
} from './room-connection';

const credentials: JoinRoomResponse = {
  roomId: 'abcdefghijklmnopqrstuv',
  displayName: 'Ace',
  participantIdentity: 'guest-123',
  serverUrl: 'wss://voice.example.test',
  token: 'signed-room-token',
};

class FakeRoomDriver implements LiveKitRoomDriver {
  participants: RoomParticipant[] = [];
  listener: ((event: RoomDriverEvent) => void) | undefined;
  connect = jest.fn(async () => undefined);
  disconnect = jest.fn(async () => undefined);
  setMicrophoneEnabled = jest.fn(async (_enabled: boolean) => undefined);
  setRemoteVolume = jest.fn((_participantIdentity: string, _volume: number) => undefined);

  subscribe(listener: (event: RoomDriverEvent) => void) {
    this.listener = listener;
    return () => {
      this.listener = undefined;
    };
  }

  emit(event: RoomDriverEvent) {
    this.listener?.(event);
  }
}

describe('RoomConnection', () => {
  it('connects with server credentials and enables the microphone', async () => {
    const driver = new FakeRoomDriver();
    const connection = new RoomConnection(driver);

    await connection.connect(credentials);

    expect(driver.connect).toHaveBeenCalledWith(credentials.serverUrl, credentials.token);
    expect(driver.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(connection.getSnapshot()).toMatchObject({
      state: 'connected',
      localMicrophoneEnabled: true,
    });
  });

  it('keeps a guest connected receive-only after microphone permission is denied', async () => {
    const driver = new FakeRoomDriver();
    driver.setMicrophoneEnabled.mockRejectedValueOnce(
      Object.assign(new Error('Microphone permission denied'), { name: 'NotAllowedError' }),
    );
    const connection = new RoomConnection(driver);

    await connection.connect(credentials);

    expect(connection.getSnapshot()).toMatchObject({
      state: 'connected_receive_only',
      localMicrophoneEnabled: false,
      errorCode: 'microphone_permission_denied',
    });

    await connection.disconnect();
    expect(connection.getSnapshot().errorCode).toBeUndefined();
  });

  it('updates mute state without disconnecting the room', async () => {
    const driver = new FakeRoomDriver();
    const connection = new RoomConnection(driver);
    await connection.connect(credentials);

    await connection.setMicrophoneEnabled(false);
    expect(connection.getSnapshot()).toMatchObject({ state: 'connected', localMicrophoneEnabled: false });

    await connection.setMicrophoneEnabled(true);
    expect(connection.getSnapshot()).toMatchObject({ state: 'connected', localMicrophoneEnabled: true });
  });

  it('publishes participant changes and maps reconnect events', async () => {
    const driver = new FakeRoomDriver();
    const connection = new RoomConnection(driver);
    await connection.connect(credentials);
    const participants: RoomParticipant[] = [
      {
        identity: 'guest-456',
        displayName: 'Scout',
        isMicrophoneEnabled: true,
        isLocal: false,
      },
    ];

    driver.emit({ type: 'participants_changed', participants });
    expect(connection.getSnapshot().participants).toEqual(participants);

    driver.emit({ type: 'reconnecting' });
    expect(connection.getSnapshot().state).toBe('reconnecting');
    driver.emit({ type: 'reconnected' });
    expect(connection.getSnapshot().state).toBe('connected');
  });

  it('clamps each participant volume independently', async () => {
    const driver = new FakeRoomDriver();
    const connection = new RoomConnection(driver);

    connection.setRemoteVolume('guest-456', 2);
    connection.setRemoteVolume('guest-789', -1);

    expect(driver.setRemoteVolume).toHaveBeenNthCalledWith(1, 'guest-456', 1);
    expect(driver.setRemoteVolume).toHaveBeenNthCalledWith(2, 'guest-789', 0);
  });

  it('maps a LiveKit full-room rejection to room_full', async () => {
    const driver = new FakeRoomDriver();
    driver.connect.mockRejectedValueOnce(new Error('room is full'));
    const connection = new RoomConnection(driver);

    await expect(connection.connect(credentials)).rejects.toMatchObject<Partial<RoomConnectionError>>({
      code: 'room_full',
    });
    expect(connection.getSnapshot()).toMatchObject({ state: 'error', errorCode: 'room_full' });
  });

  it('disconnects and clears the active call state', async () => {
    const driver = new FakeRoomDriver();
    const connection = new RoomConnection(driver);
    await connection.connect(credentials);

    await connection.disconnect();

    expect(driver.disconnect).toHaveBeenCalledTimes(1);
    expect(connection.getSnapshot()).toMatchObject({
      state: 'idle',
      participants: [],
      localMicrophoneEnabled: false,
    });
  });
});
