import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Text } from 'react-native';

import { RoomSessionProvider, useRoomSession } from '@/features/room/RoomSessionContext';
import { DisplayNameProvider } from '@/features/profile/DisplayNameContext';
import HomeScreen from '../index';

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    router: { push: jest.fn(), replace: jest.fn() },
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
const joinResponse = {
  roomId,
  displayName: 'Ace',
  participantIdentity: 'guest-123',
  serverUrl: 'wss://voice.example.test',
  token: 'signed-token',
};

function SessionProbe() {
  const { session } = useRoomSession();
  return <Text>{session?.inviteLink ?? 'no active session'}</Text>;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('HomeScreen', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_API_URL = 'https://voice-api.example.test';
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('uses the non-deprecated safe-area layout', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await render(
      <DisplayNameProvider>
        <RoomSessionProvider>
        <HomeScreen />
      </RoomSessionProvider>
      </DisplayNameProvider>,
    );

    expect(warning).not.toHaveBeenCalledWith(
      expect.stringContaining('SafeAreaView has been deprecated'),
    );
    warning.mockRestore();
  });

  it('shows the configured app name', async () => {
    const screen = await render(
      <DisplayNameProvider>
        <RoomSessionProvider>
        <HomeScreen />
        <SessionProbe />
      </RoomSessionProvider>
      </DisplayNameProvider>,
    );

    expect(screen.getByText('zero-ji-ka-hukum')).toBeTruthy();
  });

  it('creates and joins a room, then retains its invite for sharing', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(201, { roomId }))
      .mockResolvedValueOnce(jsonResponse(200, joinResponse));
    globalThis.fetch = fetcher as unknown as typeof fetch;
    const screen = await render(
      <DisplayNameProvider>
        <RoomSessionProvider>
        <HomeScreen />
        <SessionProbe />
      </RoomSessionProvider>
      </DisplayNameProvider>,
    );

    await fireEvent.changeText(screen.getByLabelText('Your name'), 'Ace');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create squad' })).toBeTruthy();
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Create squad' }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/room/[roomId]',
        params: { roomId },
      });
    });
    expect(fetcher).toHaveBeenNthCalledWith(1, 'https://voice-api.example.test/v1/rooms', {
      method: 'POST',
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      `https://voice-api.example.test/v1/rooms/${roomId}/join`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: 'Ace' }),
      },
    );
    expect(screen.getByText(`zero-ji-ka-hukum://join/${roomId}`)).toBeTruthy();
  });

  it('opens the guest form for a valid pasted invite code', async () => {
    const screen = await render(
      <DisplayNameProvider>
        <RoomSessionProvider>
        <HomeScreen />
      </RoomSessionProvider>
      </DisplayNameProvider>,
    );

    await fireEvent.changeText(screen.getByLabelText('Your name'), 'Ace');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Room invite code')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByLabelText('Room invite code'), roomId);
    await fireEvent.press(screen.getByRole('button', { name: 'Join with code' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/join/[roomId]',
      params: { roomId },
    });
  });
});
