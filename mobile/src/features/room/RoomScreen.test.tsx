import { fireEvent, render } from '@testing-library/react-native';

import type { RoomConnection, RoomConnectionSnapshot } from './room-connection';
import { RoomScreen } from './RoomScreen';

const mockOpenSettings = jest.fn(async () => undefined);

jest.mock('expo-linking', () => {
  const actual = jest.requireActual('expo-linking');
  return { ...actual, openSettings: () => mockOpenSettings() };
});

jest.mock('@react-native-community/slider', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable: MockPressable, Text: MockText } = jest.requireActual<typeof import('react-native')>(
    'react-native',
  );
  return function MockSlider({
    accessibilityLabel,
    onValueChange,
    value,
  }: {
    accessibilityLabel: string;
    onValueChange(value: number): void;
    value: number;
  }) {
    return React.createElement(
      MockPressable,
      { accessibilityRole: 'adjustable', accessibilityLabel, onPress: () => onValueChange(0.4) },
      React.createElement(MockText, null, String(value)),
    );
  };
});

const connectedSnapshot: RoomConnectionSnapshot = {
  state: 'connected',
  localMicrophoneEnabled: true,
  participants: [
    {
      identity: 'guest-local',
      displayName: 'Ace',
      isMicrophoneEnabled: true,
      isLocal: true,
    },
    {
      identity: 'guest-scout',
      displayName: 'Scout',
      isMicrophoneEnabled: true,
      isLocal: false,
    },
  ],
};

describe('RoomScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows participants, supports mute, and adjusts a friend's volume independently", async () => {
    const connection = {
      setMicrophoneEnabled: jest.fn(async () => undefined),
      setRemoteVolume: jest.fn(),
    } as unknown as RoomConnection;
    const onLeave = jest.fn();
    const screen = await render(
      <RoomScreen connection={connection} snapshot={connectedSnapshot} onLeave={onLeave} />,
    );

    expect(screen.getByText('Scout')).toBeTruthy();
    expect(screen.queryByLabelText('Volume for Ace')).toBeNull();
    expect(screen.getByLabelText('Volume for Scout')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Mute microphone' }));
    expect(connection.setMicrophoneEnabled).toHaveBeenCalledWith(false);
    await fireEvent.press(screen.getByLabelText('Volume for Scout'));
    expect(connection.setRemoteVolume).toHaveBeenCalledWith('guest-scout', 0.4);
    await fireEvent.press(screen.getByRole('button', { name: 'Leave room' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('shows receive-only guidance and opens Settings when mic permission is denied', async () => {
    const snapshot: RoomConnectionSnapshot = {
      ...connectedSnapshot,
      state: 'connected_receive_only',
      localMicrophoneEnabled: false,
      errorCode: 'microphone_permission_denied',
    };
    const connection = {
      setMicrophoneEnabled: jest.fn(async () => undefined),
      setRemoteVolume: jest.fn(),
    } as unknown as RoomConnection;
    const screen = await render(
      <RoomScreen connection={connection} snapshot={snapshot} onLeave={jest.fn()} />,
    );

    expect(screen.getByText(/Microphone access is off/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });
});
