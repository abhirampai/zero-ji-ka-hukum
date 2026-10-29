import { fireEvent, render } from '@testing-library/react-native';
import { Text, Pressable, View } from 'react-native';

import { RoomSessionProvider, useRoomSession } from './RoomSessionContext';

function SessionProbe() {
  const { session, setSession, clearSession } = useRoomSession();
  const credentials = {
    roomId: 'abcdefghijklmnopqrstuv',
    displayName: 'Ace',
    participantIdentity: 'guest-123',
    serverUrl: 'wss://voice.example.test',
    token: 'signed-token',
  };

  return (
    <View>
      <Text>{session?.credentials.token ?? 'no active session'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Set active session"
        onPress={() => setSession({ credentials, inviteLink: 'zero-ji-ka-hukum://join/room' })}
      >
        <Text>Set</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Clear active session" onPress={clearSession}>
        <Text>Clear</Text>
      </Pressable>
    </View>
  );
}

describe('RoomSessionProvider', () => {
  it('retains credentials between routes and clears them on leave', async () => {
    const screen = await render(
      <RoomSessionProvider>
        <SessionProbe />
      </RoomSessionProvider>,
    );

    expect(screen.getByText('no active session')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Set active session' }));
    expect(screen.getByText('signed-token')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Clear active session' }));
    expect(screen.getByText('no active session')).toBeTruthy();
  });
});
