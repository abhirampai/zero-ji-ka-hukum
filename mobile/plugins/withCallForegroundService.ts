import { withAndroidManifest } from 'expo/config-plugins';

import type { AndroidManifest, ManifestUsesPermission } from '@expo/config-plugins/build/android/Manifest';

export const FOREGROUND_SERVICE_PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
] as const;

const PRIMARY_SERVICE = 'com.supersami.foregroundservice.ForegroundService';
const TASK_SERVICE = 'com.supersami.foregroundservice.ForegroundServiceTask';
const FOREGROUND_SERVICE_TYPE = 'microphone|mediaPlayback';

export function addForegroundServiceSettings(
  manifest: AndroidManifest,
): AndroidManifest {
  const permissions: ManifestUsesPermission[] = [
    ...(manifest.manifest['uses-permission'] ?? []),
  ];
  for (const permission of FOREGROUND_SERVICE_PERMISSIONS) {
    if (
      !permissions.some((entry) => entry.$['android:name'] === permission)
    ) {
      permissions.push({ $: { 'android:name': permission } });
    }
  }
  manifest.manifest['uses-permission'] = permissions;

  const applications = manifest.manifest.application ?? [];
  const application =
    applications.find((entry) =>
      (entry.$['android:name'] ?? '').endsWith('.MainApplication'),
    ) ?? applications[0];
  if (!application) {
    throw new Error('AndroidManifest.xml is missing the application element');
  }

  const services = (application.service ?? []).filter(
    (service) =>
      service.$['android:name'] !== PRIMARY_SERVICE &&
      service.$['android:name'] !== TASK_SERVICE,
  );
  services.push({
    $: {
      'android:name': PRIMARY_SERVICE,
      'android:foregroundServiceType': FOREGROUND_SERVICE_TYPE,
      'android:exported': 'false',
    },
  });
  services.push({ $: { 'android:name': TASK_SERVICE } });
  application.service = services;

  return manifest;
}

const withCallForegroundService = (
  config: Parameters<typeof withAndroidManifest>[0],
) =>
  withAndroidManifest(config, (nextConfig) => ({
    ...nextConfig,
    modResults: addForegroundServiceSettings(nextConfig.modResults),
  }));

export default withCallForegroundService;
