import { RoomIdSchema } from '@bgmi/contracts/room';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createDefaultRoomApi, RoomApiError } from '@/api/room-api';
import { JoinRoomForm } from '@/features/room/JoinRoomForm';
import { useDisplayName } from '@/features/profile/DisplayNameContext';
import { useRoomSession } from '@/features/room/RoomSessionContext';

function getErrorMessage(error: unknown) {
  return error instanceof RoomApiError
    ? error.message
    : 'Something went wrong. Check your connection and try again.';
}

export default function JoinRoomScreen() {
  const params = useLocalSearchParams<{ roomId?: string | string[] }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] ?? '' : params.roomId ?? '';
  const { setSession } = useRoomSession();
  const { displayName, isReady } = useDisplayName();
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    RoomIdSchema.safeParse(roomId).success ? undefined : 'This invite code is not valid.',
  );

  const joinRoom = async (name: string) => {
    if (!RoomIdSchema.safeParse(roomId).success) {
      setErrorMessage('This invite code is not valid. Ask your friend for a new one.');
      return;
    }

    setIsJoining(true);
    setErrorMessage(undefined);
    try {
      const credentials = await createDefaultRoomApi().joinRoom(roomId, name);
      const inviteLink = `zero-ji-ka-hukum://join/${roomId}`;
      setSession({ credentials, inviteLink });
      router.replace({ pathname: '/room/[roomId]', params: { roomId } });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsJoining(false);
    }
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (displayName) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.eyebrow}>JOIN PRIVATE SQUAD</Text>
          <Text style={styles.title}>You’re almost in.</Text>
          <Text style={styles.invite}>Room {roomId || '—'}</Text>
          <Text style={styles.nameLine}>Joining as {displayName}</Text>
          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errorMessage}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isJoining ? 'Joining…' : 'Join squad'}
            accessibilityState={{ disabled: isJoining }}
            disabled={isJoining}
            onPress={() => void joinRoom(displayName)}
            style={({ pressed }) => [styles.button, (isJoining || pressed) && styles.buttonMuted]}
          >
            <Text style={styles.buttonText}>{isJoining ? 'Joining…' : 'Join squad'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>JOIN PRIVATE SQUAD</Text>
        <Text style={styles.title}>You’re almost in.</Text>
        <Text style={styles.invite}>Room {roomId || '—'}</Text>
        <JoinRoomForm onJoin={joinRoom} isJoining={isJoining} errorMessage={errorMessage} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#101513',
    flex: 1,
  },
  container: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  eyebrow: {
    color: '#B5F36B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#F4F7F5',
    fontSize: 28,
    fontWeight: '800',
  },
  invite: {
    color: '#AAB8B0',
    fontSize: 15,
    marginBottom: 8,
  },
  nameLine: {
    color: '#D8E2DB',
    fontSize: 15,
    fontWeight: '600',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#B5F36B',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  buttonMuted: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#172014',
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: '#FF9B8F',
    fontSize: 14,
  },
});
