import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface JoinRoomFormProps {
  onJoin(displayName: string): void | Promise<void>;
  isJoining: boolean;
  errorMessage?: string;
}

export function JoinRoomForm({ onJoin, isJoining, errorMessage }: JoinRoomFormProps) {
  const [displayName, setDisplayName] = useState('');
  const normalizedName = displayName.trim();
  const canJoin = normalizedName.length > 0 && normalizedName.length <= 24 && !isJoining;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your squad name</Text>
      <TextInput
        accessibilityLabel="Your name"
        autoCapitalize="words"
        autoComplete="nickname"
        maxLength={24}
        onChangeText={setDisplayName}
        placeholder="Enter a name"
        placeholderTextColor="#91A39A"
        returnKeyType="join"
        style={styles.input}
        value={displayName}
      />
      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isJoining ? 'Joining…' : 'Join squad'}
        accessibilityState={{ disabled: !canJoin }}
        disabled={!canJoin}
        onPress={() => void onJoin(normalizedName)}
        style={({ pressed }) => [styles.button, (!canJoin || pressed) && styles.buttonMuted]}
      >
        <Text style={styles.buttonText}>{isJoining ? 'Joining…' : 'Join squad'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    color: '#E8F0EB',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderColor: '#33443A',
    borderRadius: 12,
    borderWidth: 1,
    color: '#F4F7F5',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  error: {
    color: '#FF9B8F',
    fontSize: 14,
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
});
