import type { ExpoConfig } from 'expo/config';

import {
  createAppConfig,
  FOREGROUND_SERVICE_PERMISSIONS,
} from './app.config';

const BASE_CONFIG: Partial<ExpoConfig> = {
  name: 'zero-ji-ka-hukum',
  slug: 'zero-ji-ka-hukum',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'zero-ji-ka-hukum',
  platforms: ['ios', 'android'],
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bitcode: false,
    bundleIdentifier: 'com.abhi26.zerojikahukum',
  },
  android: {
    blockedPermissions: ['android.permission.CAMERA'],
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.CAMERA',
      'android.permission.INTERNET',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.WAKE_LOCK',
      'android.permission.BLUETOOTH',
    ],
    package: 'com.abhi26.zerojikahukum',
  },
  web: { output: 'server', favicon: './assets/images/favicon.png' },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    ['@livekit/react-native-expo-plugin', { android: { audioType: 'media' } }],
    '@config-plugins/react-native-webrtc',
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

describe('background-audio-config', () => {
  it('keeps the squad app identity intact', () => {
    const config = createAppConfig(BASE_CONFIG);

    expect(config.name).toBe('zero-ji-ka-hukum');
    expect(config.scheme).toBe('zero-ji-ka-hukum');
    expect(config.ios?.bundleIdentifier).toBe('com.abhi26.zerojikahukum');
    expect(config.android?.package).toBe('com.abhi26.zerojikahukum');
  });

  it('enables the iOS audio background mode and microphone purpose string', () => {
    const config = createAppConfig(BASE_CONFIG);

    expect(config.ios?.infoPlist?.UIBackgroundModes).toContain('audio');
    const purpose = config.ios?.infoPlist?.NSMicrophoneUsageDescription;
    expect(typeof purpose).toBe('string');
    expect((purpose as string).length).toBeGreaterThan(0);
  });

  it('declares the Android microphone foreground-service permissions and blocks camera', () => {
    const config = createAppConfig(BASE_CONFIG);

    const permissions = config.android?.permissions ?? [];
    for (const permission of FOREGROUND_SERVICE_PERMISSIONS) {
      expect(permissions).toContain(permission);
    }
    expect(permissions).toContain('android.permission.RECORD_AUDIO');
    expect(config.android?.blockedPermissions).toContain(
      'android.permission.CAMERA',
    );
  });

  it('deduplicates permissions when the base config already declares them', () => {
    const config = createAppConfig(BASE_CONFIG);

    const permissions = config.android?.permissions ?? [];
    const names = permissions.map((entry) => String(entry));
    expect(new Set(names).size).toBe(names.length);
  });

  it('configures LiveKit media audio and attaches the foreground-service plugin', () => {
    const config = createAppConfig(BASE_CONFIG);

    const livekitEntry = config.plugins?.find(
      (entry) => Array.isArray(entry) && entry[0] === '@livekit/react-native-expo-plugin',
    ) as [string, { android?: { audioType?: string } }] | undefined;
    expect(livekitEntry?.[1]).toEqual({
      android: { audioType: 'media' },
    });

    expect(config.plugins).toContain('./plugins/withCallForegroundService');
  });
});
