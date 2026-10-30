import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const MOBILE_ROOT = path.resolve(__dirname, '..', '..');

describe('mobile secret boundary', () => {
  function mobileSourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        return mobileSourceFiles(child);
      }
      return entry.isFile() && /\.(ts|tsx|js|json|example)$/.test(entry.name)
        ? [child]
        : [];
    });
  }

  it('never reads or ships the LiveKit API key or secret', () => {
    const sources = [
      ...mobileSourceFiles(MOBILE_ROOT),
    ].filter((file) => !/node_modules/.test(file));
    const offenders = sources.filter((file) => {
      const text = readFileSync(file, 'utf8');
      return /LIVEKIT_API_(KEY|SECRET)/.test(text);
    });

    expect(offenders).toEqual([]);
  });

  it('documents only the public API URL in the mobile env example', () => {
    const text = readFileSync(path.join(MOBILE_ROOT, '.env.example'), 'utf8');
    expect(text).toContain('EXPO_PUBLIC_API_URL=');
    expect(text).not.toMatch(/LIVEKIT_API_(KEY|SECRET)/);
  });
});
