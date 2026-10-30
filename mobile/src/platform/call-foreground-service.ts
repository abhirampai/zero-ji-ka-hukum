import { PermissionsAndroid, Platform } from 'react-native';
interface ForegroundServiceModule {
  default: {
    register: (options: Record<string, unknown>) => void;
    start: (options: Record<string, unknown>) => Promise<void>;
    stop: () => Promise<void>;
    isRunning: () => boolean;
  };
}

// Lazy-load the native module so importing this file never pulls in a
// library that crashes at module scope on non-Android platforms (iOS has no
// native implementation and its index.js calls `new NativeEventEmitter()`).
function loadForegroundService(): ForegroundServiceModule['default'] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@supersami/rn-foreground-service') as ForegroundServiceModule).default;
}

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
    loadForegroundService().register({
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
    await loadForegroundService().start({
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
    await loadForegroundService().stop();
  },
};
