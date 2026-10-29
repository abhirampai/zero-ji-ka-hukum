import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { RoomSessionProvider, useRoomSession } from '@/features/room/RoomSessionContext';
import JoinRoomScreen from '../join/[roomId]';

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    router: { push: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: jest.fn(() => ({ roomId: 'abcdefghijklmnopqrstuv' })),
  };
});

jest.mock('expo-linking', () => {
  const actual = jest.requireActual('expo-linking');
  return {
    ...actual,
    createURL: (path: string, options: { scheme: string }) => `${options.scheme}://${path.slice(1)}`,
  };
});

const roomId = 'abcdefghijklmnopqrstuv';

function SessionProbe() {
  const { session } = useRoomSession();
  return <Text>{session?.credentials.displayName ?? 'no active session'}</Text>;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('JoinRoomScreen', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_API_URL = 'https://voice-api.example.test';
    jest.mocked(useLocalSearchParams).mockReturnValue({ roomId });
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('joins the invite and places the guest into the room session', async () => {
    const fetcher = jest.fn(async () =>
      jsonResponse(200, {
        roomId,
        displayName: 'Ace',
        participantIdentity: 'guest-123',
        serverUrl: 'wss://voice.example.test',
        token: 'signed-token',
      }),
    );
    globalThis.fetch = fetcher as unknown as typeof fetch;
    const screen = await render(
      <RoomSessionProvider>
        <JoinRoomScreen />
        <SessionProbe />
      </RoomSessionProvider>,
    );

    await fireEvent.changeText(screen.getByLabelText('Your name'), 'Ace');
    await fireEvent.press(screen.getByRole('button', { name: 'Join squad' }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/room/[roomId]',
        params: { roomId },
      });
    });
    expect(fetcher).toHaveBeenCalledWith(`https://voice-api.example.test/v1/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: 'Ace' }),
    });
    expect(screen.getByText('Ace')).toBeTruthy();
  });
});
