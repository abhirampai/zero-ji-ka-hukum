import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Pressable, SafeAreaView, Share, StyleSheet, Text, View } from 'react-native';

import { useRoomSession } from '@/features/room/RoomSessionContext';

export default function RoomInviteScreen() {
  const params = useLocalSearchParams<{ roomId?: string | string[] }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] ?? '' : params.roomId ?? '';
  const { session } = useRoomSession();
  const [copied, setCopied] = useState(false);

  if (!session || session.credentials.roomId !== roomId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Room session not found</Text>
          <Link href="/" style={styles.homeLink}>Back to home</Link>
        </View>
      </SafeAreaView>
    );
  }

  const copyRoomCode = async () => {
    await Clipboard.setStringAsync(session.credentials.roomId, {
      android: { isSensitive: true },
    });
    setCopied(true);
  };

  const shareInvite = async () => {
    await Share.share({ message: session.inviteLink });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>SQUAD ROOM</Text>
        <Text style={styles.title}>Invite your squad</Text>
        <Text style={styles.subtitle}>Share this private invite with up to three friends.</Text>
        <View style={styles.codeCard}>
          <Text style={styles.label}>ROOM CODE</Text>
          <Text selectable style={styles.code}>{session.credentials.roomId}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Room code copied' : 'Copy room code'}
          onPress={() => void copyRoomCode()}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>{copied ? 'Copied!' : 'Copy room code'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share invite"
          onPress={() => void shareInvite()}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Share invite</Text>
        </Pressable>
        <Text style={styles.status}>Voice connection starts in the next step.</Text>
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
  subtitle: {
    color: '#AAB8B0',
    fontSize: 16,
  },
  codeCard: {
    backgroundColor: '#19221D',
    borderColor: '#2D3D33',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  label: {
    color: '#91A39A',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  code: {
    color: '#F4F7F5',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
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
  status: {
    color: '#91A39A',
    fontSize: 13,
    textAlign: 'center',
  },
  homeLink: {
    color: '#B5F36B',
    fontSize: 16,
  },
});
