import type {
  AndroidManifest,
  ManifestUsesPermission,
} from '@expo/config-plugins/build/android/Manifest';

import {
  addForegroundServiceSettings,
  FOREGROUND_SERVICE_PERMISSIONS,
} from './withCallForegroundService';

function createManifest(): AndroidManifest {
  return {
    manifest: {
      $: {
        'xmlns:android': 'http://schemas.android.com/apk/res/android',
        'xmlns:tools': 'http://schemas.android.com/tools',
        'package': 'com.abhi26.zerojikahukum',
      },
      'uses-permission': [
        { $: { 'android:name': 'android.permission.RECORD_AUDIO' } },
        { $: { 'android:name': 'android.permission.INTERNET' } },
      ],
      queries: [],
      application: [
        { $: { 'android:name': '.MainApplication' }, service: [] },
      ],
    },
  } as unknown as AndroidManifest;
}

function permissionNames(
  manifest: AndroidManifest,
): (string | undefined)[] {
  return (manifest.manifest['uses-permission'] ?? []).map(
    (entry: ManifestUsesPermission) => entry?.$?.['android:name'],
  );
}

function serviceNames(manifest: AndroidManifest): (string | undefined)[] {
  return (
    manifest.manifest.application?.find((application) =>
      (application.$['android:name'] ?? '').endsWith('.MainApplication'),
    )?.service ?? []
  ).map((service) => service?.$?.['android:name']);
}

describe('withCallForegroundService', () => {
  it('adds the notification and foreground-service permissions', () => {
    const result = addForegroundServiceSettings(createManifest());

    const names = permissionNames(result);
    for (const permission of FOREGROUND_SERVICE_PERMISSIONS) {
      expect(names).toContain(permission);
    }
  });

  it('declares the supersami service with microphone and mediaPlayback types', () => {
    const result = addForegroundServiceSettings(createManifest());

    const names = serviceNames(result);
    expect(names).toContain(
      'com.supersami.foregroundservice.ForegroundService',
    );
    expect(names).toContain(
      'com.supersami.foregroundservice.ForegroundServiceTask',
    );

    const mainService = result.manifest.application
      ?.find((application) =>
        (application.$['android:name'] ?? '').endsWith('.MainApplication'),
      )
      ?.service?.find(
        (service) =>
          service.$['android:name'] ===
          'com.supersami.foregroundservice.ForegroundService',
      );
    expect(mainService?.$).toMatchObject({
      'android:foregroundServiceType': 'microphone|mediaPlayback',
      'android:exported': 'false',
    });
  });

  it('does not duplicate entries when applied twice', () => {
    const once = addForegroundServiceSettings(createManifest());
    const twice = addForegroundServiceSettings(once);

    const names = serviceNames(twice);
    expect(
      names.filter(
        (name) => name === 'com.supersami.foregroundservice.ForegroundService',
      ),
    ).toHaveLength(1);
    expect(
      permissionNames(twice).filter(
        (name) => name === 'android.permission.FOREGROUND_SERVICE',
      ),
    ).toHaveLength(1);
  });
});
