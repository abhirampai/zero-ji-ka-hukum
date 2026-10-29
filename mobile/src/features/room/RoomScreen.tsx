import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ParticipantRow } from './ParticipantRow';
import type { RoomConnection, RoomConnectionSnapshot } from './room-connection';

interface RoomScreenProps {
  connection: Pick<RoomConnection, 'setMicrophoneEnabled' | 'setRemoteVolume'>;
  snapshot: RoomConnectionSnapshot;
  onLeave(): void;
}

const CONNECTION_LABELS: Record<RoomConnectionSnapshot['state'], string> = {
  idle: 'Not connected',
  creating: 'Creating room…',
  joining: 'Joining squad…',
  connected: 'Voice connected',
  connected_receive_only: 'Connected · listening only',
  reconnecting: 'Reconnecting…',
  error: 'Connection failed',
};

export function RoomScreen({ connection, snapshot, onLeave }: RoomScreenProps) {
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [controlError, setControlError] = useState<string | null>(null);
  const isConnected =
    snapshot.state === 'connected' ||
    snapshot.state === 'connected_receive_only' ||
    snapshot.state === 'reconnecting';

  const onMicrophonePress = async () => {
    setControlError(null);
    try {
      await connection.setMicrophoneEnabled(!snapshot.localMicrophoneEnabled);
    } catch {
      setControlError('Could not change microphone state. Try again.');
    }
  };

  const onVolumeChange = (identity: string, volume: number) => {
    setVolumes((current) => ({ ...current, [identity]: volume }));
    connection.setRemoteVolume(identity, volume);
  };

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      setControlError('Open your device settings to allow microphone access.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>SQUAD VOICE</Text>
          <Text style={styles.title}>In the room</Text>
          <Text accessibilityLiveRegion="polite" style={styles.status}>
            {CONNECTION_LABELS[snapshot.state]}
          </Text>
        </View>

        {snapshot.errorCode === 'microphone_permission_denied' ? (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionText}>
              Microphone access is off. You can still listen to your squad.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
              onPress={() => void openSettings()}
            >
              <Text style={styles.settingsLink}>Open Settings</Text>
            </Pressable>
          </View>
        ) : null}

        {snapshot.errorCode === 'room_full' ? (
          <Text accessibilityRole="alert" style={styles.error}>
            This room already has four players.
          </Text>
        ) : null}

        {controlError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {controlError}
          </Text>
        ) : null}

        <ScrollView contentContainerStyle={styles.participantList}>
          {snapshot.participants.map((participant) => (
            <ParticipantRow
              key={participant.identity}
              participant={participant}
              volume={volumes[participant.identity] ?? 1}
              onVolumeChange={(volume) => onVolumeChange(participant.identity, volume)}
            />
          ))}
        </ScrollView>

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={snapshot.localMicrophoneEnabled ? 'Mute microphone' : 'Enable microphone'}
            disabled={!isConnected}
            onPress={() => void onMicrophonePress()}
            style={[styles.micButton, !isConnected && styles.disabledButton]}
          >
            <Text style={styles.micButtonText}>
              {snapshot.localMicrophoneEnabled ? 'Mute mic' : 'Enable mic'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave room"
            onPress={onLeave}
            style={styles.leaveButton}
          >
            <Text style={styles.leaveButtonText}>Leave</Text>
          </Pressable>
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  heading: {
    gap: 8,
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
  status: {
    color: '#AAB8B0',
    fontSize: 14,
  },
  permissionCard: {
    backgroundColor: '#2A2720',
    borderColor: '#68563A',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  permissionText: {
    color: '#F4E8CF',
    fontSize: 14,
  },
  settingsLink: {
    color: '#B5F36B',
    fontSize: 14,
    fontWeight: '700',
  },
  error: {
    color: '#FF9B8F',
    fontSize: 14,
  },
  participantList: {
    gap: 10,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  micButton: {
    alignItems: 'center',
    backgroundColor: '#B5F36B',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
  },
  micButtonText: {
    color: '#172014',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.5,
  },
  leaveButton: {
    alignItems: 'center',
    backgroundColor: '#402724',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 24,
  },
  leaveButtonText: {
    color: '#FFC0B8',
    fontSize: 16,
    fontWeight: '800',
  },
});
