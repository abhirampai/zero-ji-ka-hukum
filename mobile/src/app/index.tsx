import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>zero-ji-ka-hukum</Text>
      <Text style={styles.subtitle}>Squad voice for BGMI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#101513',
  },
  name: {
    color: '#F4F7F5',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#AAB8B0',
    fontSize: 16,
  },
});
