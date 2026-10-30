import { RoomIdSchema } from '@bgmi/contracts/room';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createDefaultRoomApi, createInviteLink, RoomApiError } from '@/api/room-api';
import { useDisplayName } from '@/features/profile/DisplayNameContext';
import { useRoomSession } from '@/features/room/RoomSessionContext';

function getErrorMessage(error: unknown) {
  return error instanceof RoomApiError
    ? error.message
    : 'Something went wrong. Check your connection and try again.';
}

export default function HomeScreen() {
  const { setSession } = useRoomSession();
  const { displayName, isReady, setDisplayName } = useDisplayName();
  const [pendingName, setPendingName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const normalizedRoomCode = roomCode.trim();
  const canCreate = !!displayName && displayName.trim().length > 0 && displayName.trim().length <= 24 && !isCreating;
  const canJoin = RoomIdSchema.safeParse(normalizedRoomCode).success;
  const canSaveName = pendingName.trim().length > 0 && pendingName.trim().length <= 24 && !isSavingName;

  const saveName = async () => {
    if (!canSaveName) {
      return;
    }
    setIsSavingName(true);
    setErrorMessage(null);
    try {
      await setDisplayName(pendingName.trim());
    } catch {
      setErrorMessage('Could not save your name. Try again.');
    } finally {
      setIsSavingName(false);
    }
  };

  const createSquad = async () => {
    if (!canCreate || !displayName) {
      return;
    }
    const name = displayName.trim();
    setIsCreating(true);
    setErrorMessage(null);
    try {
      const api = createDefaultRoomApi();
      const { roomId } = await api.createRoom();
      const credentials = await api.joinRoom(roomId, name);
      const inviteLink = createInviteLink(roomId);
      setSession({ credentials, inviteLink });
      router.replace({ pathname: '/room/[roomId]', params: { roomId } });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const openInvite = () => {
    if (!canJoin) {
      setErrorMessage('Enter a valid room invite code.');
      return;
    }
    setErrorMessage(null);
    router.push({ pathname: '/join/[roomId]', params: { roomId: normalizedRoomCode } });
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.subtitle}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!displayName) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>BGMI SQUAD COMMS</Text>
            <Text style={styles.title}>zero-ji-ka-hukum</Text>
            <Text style={styles.subtitle}>Pick a name for your squad.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Choose your username</Text>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              accessibilityLabel="Your name"
              autoCapitalize="words"
              autoComplete="nickname"
              maxLength={24}
              onChangeText={setPendingName}
              placeholder="Enter a name"
              placeholderTextColor="#91A39A"
              returnKeyType="done"
              style={styles.input}
              value={pendingName}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSavingName ? 'Saving name' : 'Continue'}
              accessibilityState={{ disabled: !canSaveName }}
              disabled={!canSaveName}
              onPress={() => void saveName()}
              style={({ pressed }) => [styles.primaryButton, (!canSaveName || pressed) && styles.buttonMuted]}
            >
              <Text style={styles.primaryButtonText}>{isSavingName ? 'Saving…' : 'Continue'}</Text>
            </Pressable>
          </View>

          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errorMessage}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>BGMI SQUAD COMMS</Text>
          <Text style={styles.title}>zero-ji-ka-hukum</Text>
          <Text style={styles.subtitle}>Playing as {displayName}. Get your squad in sync.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create a private room</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isCreating ? 'Creating room' : 'Create squad'}
            accessibilityState={{ disabled: !canCreate }}
            disabled={!canCreate}
            onPress={() => void createSquad()}
            style={({ pressed }) => [styles.primaryButton, (!canCreate || pressed) && styles.buttonMuted]}
          >
            <Text style={styles.primaryButtonText}>{isCreating ? 'Creating room…' : 'Create squad'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Joining your friends?</Text>
          <Text style={styles.label}>Room invite code</Text>
          <TextInput
            accessibilityLabel="Room invite code"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={22}
            onChangeText={setRoomCode}
            placeholder="Paste the 22-character code"
            placeholderTextColor="#91A39A"
            style={styles.input}
            value={roomCode}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Join with code"
            accessibilityState={{ disabled: !canJoin }}
            disabled={!canJoin}
            onPress={openInvite}
            style={({ pressed }) => [styles.secondaryButton, (!canJoin || pressed) && styles.buttonMuted]}
          >
            <Text style={styles.secondaryButtonText}>Join with code</Text>
          </Pressable>
        </View>

        {errorMessage ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {errorMessage}
          </Text>
        ) : null}
        <Text style={styles.footer}>Private voice rooms · Up to four players</Text>
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
    gap: 20,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  heading: {
    gap: 8,
    marginBottom: 8,
  },
  eyebrow: {
    color: '#B5F36B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#F4F7F5',
    fontSize: 29,
    fontWeight: '800',
  },
  subtitle: {
    color: '#AAB8B0',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#19221D',
    borderColor: '#2D3D33',
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  sectionTitle: {
    color: '#F4F7F5',
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    color: '#D8E2DB',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderColor: '#3A4A40',
    borderRadius: 12,
    borderWidth: 1,
    color: '#F4F7F5',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#B5F36B',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButtonText: {
    color: '#172014',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#627467',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  secondaryButtonText: {
    color: '#E8F0EB',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonMuted: {
    opacity: 0.55,
  },
  error: {
    color: '#FF9B8F',
    fontSize: 14,
  },
  footer: {
    color: '#91A39A',
    fontSize: 13,
    textAlign: 'center',
  },
});
