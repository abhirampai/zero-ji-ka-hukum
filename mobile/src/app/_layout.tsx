import { Stack } from 'expo-router';
import { registerGlobals } from '@livekit/react-native';

import { RoomSessionProvider } from '@/features/room/RoomSessionContext';

registerGlobals();

export default function RootLayout() {
  return (
    <RoomSessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RoomSessionProvider>
  );
}
