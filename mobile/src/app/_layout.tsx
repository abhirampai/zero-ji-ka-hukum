import { Stack } from 'expo-router';
import {
  registerGlobals,
  setupIOSAudioManagement,
  type IOSAudioSessionPolicy,
} from '@livekit/react-native';

import { CallForegroundService } from '@/platform/call-foreground-service';
import { RoomSessionProvider } from '@/features/room/RoomSessionContext';
import { DisplayNameProvider } from '@/features/profile/DisplayNameContext';

// Automatic session setup is disabled so the explicit policy below is the
// single source of truth for the AVAudioSession category/mode.
registerGlobals({ autoConfigureAudioSession: false });

// Recording (mic on): playAndRecord + voiceChat so teammates stay clear.
// Playout (mic off): playback + spokenAudio and mixWithOthers so BGMI keeps its
// own volume while the squad stays audible.
const IOS_AUDIO_POLICY: IOSAudioSessionPolicy = {
  recording: {
    audioCategory: 'playAndRecord',
    audioCategoryOptions: ['allowBluetooth', 'mixWithOthers'],
    audioMode: 'voiceChat',
  },
  playout: {
    audioCategory: 'playback',
    audioCategoryOptions: ['mixWithOthers'],
    audioMode: 'spokenAudio',
  },
};

setupIOSAudioManagement(true, IOS_AUDIO_POLICY);
CallForegroundService.setup();

export default function RootLayout() {
  return (
    <DisplayNameProvider>
      <RoomSessionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </RoomSessionProvider>
    </DisplayNameProvider>
  );
}
