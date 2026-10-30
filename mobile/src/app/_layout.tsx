import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { RoomSessionProvider } from '@/features/room/RoomSessionContext';
import { DisplayNameProvider } from '@/features/profile/DisplayNameContext';

import type {
  IOSAudioSessionPolicy,
  setupIOSAudioManagement as SetupIOSAudioManagementType,
} from '@livekit/react-native';

// Automatic session setup is disabled so the explicit policy below is the
// single source of truth for the AVAudioSession category/mode.
// Native-only setup is guarded so the module can be imported during web/SSR
// bundling (where `requireNativeComponent` does not exist).
if (Platform.OS === "ios" || Platform.OS === "android") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const livekit = require('@livekit/react-native') as {
    registerGlobals: (options: { autoConfigureAudioSession: boolean }) => void;
    setupIOSAudioManagement: typeof SetupIOSAudioManagementType;
  };
  livekit.registerGlobals({ autoConfigureAudioSession: false });

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

  livekit.setupIOSAudioManagement(true, IOS_AUDIO_POLICY);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CallForegroundService } = require('@/platform/call-foreground-service') as {
    CallForegroundService: { setup: () => void };
  };
  CallForegroundService.setup();
}

export default function RootLayout() {
  return (
    <DisplayNameProvider>
      <RoomSessionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </RoomSessionProvider>
    </DisplayNameProvider>
  );
}
