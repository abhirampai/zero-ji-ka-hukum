import { PermissionsAndroid, Platform } from 'react-native';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';

const CALL_NOTIFICATION_ID = 4712;

export interface CallForegroundServiceOptions {
  /** Whether the guest holds a granted microphone recording permission. */
  microphoneGranted: boolean;
}

function isAndroidPlatform(): boolean {
  return Platform.OS === 'android';
}

async function requestNotificationPermission(): Promise<void> {
  if (Number(Platform.Version) < 33) {
    return;
  }
  try {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  } catch {
    // Without POST_NOTIFICATIONS the ongoing call notification is suppressed on
    // Android 13+, but the voice session itself keeps working.
  }
}

export const CallForegroundService = {
  /** Called once at app startup; safe to call again. */
  setup(): void {
    if (!isAndroidPlatform()) {
      return;
    }
    ReactNativeForegroundService.register({
      config: {
        alert: false,
        onServiceErrorCallBack: () => {
          console.error('Background voice service failed to start');
        },
      },
    });
  },

  async start(options: CallForegroundServiceOptions = { microphoneGranted: false }): Promise<void> {
    if (!isAndroidPlatform()) {
      return;
    }
    await requestNotificationPermission();
    await ReactNativeForegroundService.start({
      id: CALL_NOTIFICATION_ID,
      title: 'Squad voice chat',
      message: 'Voice chat is active in the background.',
      importance: 'default',
      vibration: false,
      icon: 'ic_launcher',
      // microphone keeps the mic running in BGMI; mediaPlayback keeps the
      // squad audible for listen-only guests.
      ServiceType: options.microphoneGranted ? 'microphone' : 'mediaPlayback',
    } as never);
  },

  async stop(): Promise<void> {
    if (!isAndroidPlatform()) {
      return;
    }
    await ReactNativeForegroundService.stop();
  },
};
