import { Stack } from 'expo-router';

import { RoomSessionProvider } from '@/features/room/RoomSessionContext';

export default function RootLayout() {
  return (
    <RoomSessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RoomSessionProvider>
  );
}
