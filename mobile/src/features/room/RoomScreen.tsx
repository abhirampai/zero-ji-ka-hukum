import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ParticipantRow } from './ParticipantRow';
import type { RoomConnection, RoomConnectionSnapshot } from './room-connection';

interface RoomScreenProps {
  connection: Pick<
    RoomConnection,
    | 'setMicrophoneEnabled'
    | 'setRemoteVolume'
    | 'listAudioInputDevices'
    | 'setAudioInputDevice'
    | 'muteParticipant'
  >;
  snapshot: RoomConnectionSnapshot;
  onLeave(): void;
  roomId?: string;
  inviteLink?: string;
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

export function RoomScreen({ connection, snapshot, onLeave, roomId, inviteLink }: RoomScreenProps) {
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [controlError, setControlError] = useState<string | null>(null);
  const [microphones, setMicrophones] = useState< { deviceId: string; label: string }[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
  const isConnected =
    snapshot.state === 'connected' ||
    snapshot.state === 'connected_receive_only' ||
    snapshot.state === 'reconnecting';

  const localParticipant = snapshot.participants.find((participant) => participant.isLocal);
  const localName = localParticipant?.displayName ?? 'You';

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
    setMuted((current) => ({ ...current, [identity]: volume === 0 }));
    connection.setRemoteVolume(identity, volume);
  };

  const onToggleMuteParticipant = (identity: string) => {
    const isMuted = muted[identity] ?? (volumes[identity] ?? 1) === 0;
    const nextMuted = !isMuted;
    setMuted((current) => ({ ...current, [identity]: nextMuted }));
    if (nextMuted) {
      setVolumes((current) => ({ ...current, [identity]: 0 }));
      connection.setRemoteVolume(identity, 0);
      connection.muteParticipant?.(identity, true);
    } else {
      const restored = volumes[identity] && volumes[identity] > 0 ? volumes[identity] : 1;
      setVolumes((current) => ({ ...current, [identity]: restored }));
      connection.setRemoteVolume(identity, restored);
      connection.muteParticipant?.(identity, false);
    }
  };

  const onVolumeStep = (identity: string, delta: number) => {
    const current = volumes[identity] ?? 1;
    const next = Math.min(1, Math.max(0, current + delta));
    onVolumeChange(identity, next);
  };

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      setControlError('Open your device settings to allow microphone access.');
    }
  };

  const onShareInvite = async () => {
    try {
      await Share.share({
        message: inviteLink ?? (roomId ? `zero-ji-ka-hukum://join/${roomId}` : ''),
      });
    } catch {
      setControlError('Could not open the share sheet.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadDevices = async () => {
      if (typeof connection.listAudioInputDevices !== 'function') {
        return;
      }
      try {
        const devices = await connection.listAudioInputDevices();
        if (cancelled) {
          return;
        }
        setMicrophones(devices);
        if (devices.length > 0 && !selectedMicrophone) {
          setSelectedMicrophone(devices[0].deviceId);
        }
      } catch {
        // Device enumeration is optional; fall back to the default microphone.
      }
    };
    void loadDevices();
    return () => {
      cancelled = true;
    };
  }, [connection, selectedMicrophone]);

  const onSelectMicrophone = async (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    try {
      await connection.setAudioInputDevice?.(deviceId);
    } catch {
      setControlError('Could not switch microphone.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>SQUAD VOICE</Text>
          <Text style={styles.title}>In the room</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Your name</Text>
            <Text style={styles.codeValue}>{localName}</Text>
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.status}>
            {CONNECTION_LABELS[snapshot.state]}
          </Text>
          {roomId ? (
            <View style={styles.codeRow}>
              <Text style={styles.codeLabel}>Room code</Text>
              <Text accessibilityLabel="Room code" selectable style={styles.codeValue}>
                {roomId}
              </Text>
            </View>
          ) : null}
          {inviteLink ? (
            <Text selectable style={styles.inviteLink}>
              {inviteLink}
            </Text>
          ) : null}
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

        {microphones.length > 0 ? (
          <View style={styles.micSourceCard}>
            <Text style={styles.sectionTitle}>Microphone source</Text>
            <View style={styles.micSourceList}>
              {microphones.map((device) => (
                <Pressable
                  key={device.deviceId}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${device.label}`}
                  onPress={() => void onSelectMicrophone(device.deviceId)}
                  style={[
                    styles.micSourceButton,
                    selectedMicrophone === device.deviceId && styles.micSourceButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.micSourceText,
                      selectedMicrophone === device.deviceId && styles.micSourceTextActive,
                    ]}
                  >
                    {device.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.participantList}>
          {snapshot.participants.map((participant) => (
            <View key={participant.identity} style={styles.participantWrapper}>
              <ParticipantRow
                participant={participant}
                volume={volumes[participant.identity] ?? 1}
                onVolumeChange={(volume) => onVolumeChange(participant.identity, volume)}
              />
              {!participant.isLocal ? (
                <View style={styles.participantControls}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      muted[participant.identity] ?? (volumes[participant.identity] ?? 1) === 0
                        ? `Unmute ${participant.displayName}`
                        : `Mute ${participant.displayName}`
                    }
                    onPress={() => onToggleMuteParticipant(participant.identity)}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>
                      {muted[participant.identity] ?? (volumes[participant.identity] ?? 1) === 0
                        ? 'Unmute'
                        : 'Mute'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease volume for ${participant.displayName}`}
                    onPress={() => onVolumeStep(participant.identity, -0.1)}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>−</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Increase volume for ${participant.displayName}`}
                    onPress={() => onVolumeStep(participant.identity, 0.1)}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>+</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
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
          {roomId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share room code"
              onPress={() => void onShareInvite()}
              style={styles.shareButton}
            >
              <Text style={styles.shareButtonText}>Share invite link</Text>
            </Pressable>
          ) : null}
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
  you: {
    color: '#D8E2DB',
    fontSize: 14,
    fontWeight: '600',
  },
  status: {
    color: '#AAB8B0',
    fontSize: 14,
  },
  codeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  codeLabel: {
    color: '#91A39A',
    fontSize: 13,
    fontWeight: '700',
  },
  codeValue: {
    color: '#F4F7F5',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  inviteLink: {
    color: '#B5F36B',
    fontSize: 13,
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
  micSourceCard: {
    backgroundColor: '#19221D',
    borderColor: '#2D3D33',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  sectionTitle: {
    color: '#F4F7F5',
    fontSize: 15,
    fontWeight: '700',
  },
  micSourceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  micSourceButton: {
    backgroundColor: '#243128',
    borderColor: '#3A4A40',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  micSourceButtonActive: {
    backgroundColor: '#B5F36B',
    borderColor: '#B5F36B',
  },
  micSourceText: {
    color: '#E8F0EB',
    fontSize: 13,
    fontWeight: '600',
  },
  micSourceTextActive: {
    color: '#172014',
  },
  participantList: {
    gap: 10,
  },
  participantWrapper: {
    gap: 6,
  },
  participantControls: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: '#243128',
    borderColor: '#3A4A40',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 44,
    paddingHorizontal: 10,
  },
  smallButtonText: {
    color: '#E8F0EB',
    fontSize: 13,
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  micButton: {
    alignItems: 'center',
    backgroundColor: '#B5F36B',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    minWidth: 120,
  },
  micButtonText: {
    color: '#172014',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.5,
  },
  shareButton: {
    alignItems: 'center',
    backgroundColor: '#243128',
    borderColor: '#627467',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  shareButtonText: {
    color: '#E8F0EB',
    fontSize: 14,
    fontWeight: '800',
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
