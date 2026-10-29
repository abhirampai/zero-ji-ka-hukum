import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('requires LiveKit URL, API key, and API secret', () => {
    expect(() => loadConfig({})).toThrow();
  });

  it('accepts a valid secure LiveKit configuration and applies the default port', () => {
    expect(
      loadConfig({
        LIVEKIT_URL: 'wss://voice.example.test',
        LIVEKIT_API_KEY: 'api-key',
        LIVEKIT_API_SECRET: 'api-secret',
      }),
    ).toEqual({
      livekitUrl: 'wss://voice.example.test',
      livekitApiKey: 'api-key',
      livekitApiSecret: 'api-secret',
      port: 3000,
    });
  });

  it('rejects insecure or invalid LiveKit URLs', () => {
    expect(() =>
      loadConfig({
        LIVEKIT_URL: 'http://voice.example.test',
        LIVEKIT_API_KEY: 'api-key',
        LIVEKIT_API_SECRET: 'api-secret',
      }),
    ).toThrow();
  });
});
