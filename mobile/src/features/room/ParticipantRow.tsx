import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';

import type { RoomParticipant } from './room-connection';

interface ParticipantRowProps {
  participant: RoomParticipant;
  volume: number;
  onVolumeChange(volume: number): void;
}

export function ParticipantRow({ participant, volume, onVolumeChange }: ParticipantRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.nameBlock}>
        <Text style={styles.name}>{participant.displayName}</Text>
        <Text style={styles.micState}>
          {participant.isMicrophoneEnabled ? 'Mic on' : 'Mic muted'}
          {participant.isLocal ? ' · You' : ''}
        </Text>
      </View>
      {!participant.isLocal ? (
        <Slider
          accessibilityLabel={`Volume for ${participant.displayName}`}
          maximumTrackTintColor="#425247"
          maximumValue={1}
          minimumTrackTintColor="#B5F36B"
          minimumValue={0}
          onValueChange={onVolumeChange}
          step={0.05}
          style={styles.slider}
          thumbTintColor="#B5F36B"
          value={volume}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: '#19221D',
    borderColor: '#2D3D33',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: '#F4F7F5',
    fontSize: 16,
    fontWeight: '700',
  },
  micState: {
    color: '#91A39A',
    fontSize: 12,
  },
  slider: {
    width: 136,
  },
});
