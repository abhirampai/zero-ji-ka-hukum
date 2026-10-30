import * as FileSystem from 'expo-file-system/legacy';

const FILE_NAME = 'display-name.txt';
const filePath = `${FileSystem.documentDirectory ?? ''}${FILE_NAME}`;

export async function loadDisplayName(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) {
      return null;
    }
    const value = await FileSystem.readAsStringAsync(filePath);
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export async function saveDisplayName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return;
  }
  await FileSystem.writeAsStringAsync(filePath, trimmed);
}

export async function clearDisplayName(): Promise<void> {
  try {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  } catch {
    // Ignore cleanup errors.
  }
}
