import type { ConfigContext, ExpoConfig } from 'expo/config';

export const FOREGROUND_SERVICE_PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
] as const;

const MICROPHONE_PURPOSE =
  'Enables squad voice chat with your teammates while you play BGMI.';

const LIVEKIT_PLUGIN = '@livekit/react-native-expo-plugin';

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function createAppConfig(
  base: Partial<ExpoConfig> = {},
): Partial<ExpoConfig> {
  type PluginEntry = NonNullable<ExpoConfig['plugins']>[number];
  const basePlugins: PluginEntry[] = (base.plugins as PluginEntry[]) ?? [];
  const isLiveKitEntry = (plugin: PluginEntry): boolean =>
    plugin === LIVEKIT_PLUGIN ||
    (Array.isArray(plugin) && (plugin as [string, unknown])[0] === LIVEKIT_PLUGIN);
  const plugins: PluginEntry[] = [
    ...basePlugins.filter((plugin) => !isLiveKitEntry(plugin)),
    [LIVEKIT_PLUGIN, { android: { audioType: 'media' } }] as PluginEntry,
    [
      'expo-build-properties',
      {
        android: {
          enableMinifyInReleaseBuilds: false,
        },
      },
    ] as PluginEntry,
    './plugins/withCallForegroundService',
  ];

  return {
    ...base,
    scheme: base.scheme ?? 'zero-ji-ka-hukum',
    ios: {
      ...base.ios,
      infoPlist: {
        ...base.ios?.infoPlist,
        NSMicrophoneUsageDescription:
          base.ios?.infoPlist?.NSMicrophoneUsageDescription ?? MICROPHONE_PURPOSE,
        UIBackgroundModes: unique([
          'audio',
          ...(base.ios?.infoPlist?.UIBackgroundModes ?? []),
        ]),
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      ...base.android,
      permissions: unique([
        ...(base.android?.permissions ?? []).filter(
          (permission) => permission !== 'android.permission.CAMERA',
        ),
        'android.permission.RECORD_AUDIO',
        ...FOREGROUND_SERVICE_PERMISSIONS,
      ]),
      blockedPermissions: unique([
        ...(base.android?.blockedPermissions ?? []),
        'android.permission.CAMERA',
      ]),
    },
    plugins,
  };
}

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  return createAppConfig(config) as ExpoConfig;
}
