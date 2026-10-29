import { RoomIdSchema } from '@bgmi/contracts/room';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { createDefaultRoomApi, createInviteLink, RoomApiError } from '@/api/room-api';
import { JoinRoomForm } from '@/features/room/JoinRoomForm';
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
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    RoomIdSchema.safeParse(roomId).success ? undefined : 'This invite code is not valid.',
  );

  const joinRoom = async (displayName: string) => {
    if (!RoomIdSchema.safeParse(roomId).success) {
      setErrorMessage('This invite code is not valid. Ask your friend for a new one.');
      return;
    }

    setIsJoining(true);
    setErrorMessage(undefined);
    try {
      const credentials = await createDefaultRoomApi().joinRoom(roomId, displayName);
      const inviteLink = createInviteLink(roomId);
      setSession({ credentials, inviteLink });
      router.replace({ pathname: '/room/[roomId]', params: { roomId } });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsJoining(false);
    }
  };

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
});
