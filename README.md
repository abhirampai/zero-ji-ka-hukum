# zero-ji-ka-hukum

Cross-platform voice chat for BGMI squads of up to four players.

- `@bgmi/mobile` — Expo client (`mobile/`) with LiveKit voice, keep-alive in background.
- `@bgmi/server` — Fastify room/token API (`server/`).
- `@bgmi/contracts` — shared Zod schemas (`packages/contracts/`).

## Mobile setup

```bash
npm install
npm test --workspace @bgmi/mobile   # Jest suites (run serially via --runInBand)
npm run typecheck && npm run lint
```

1. Configure LiveKit credentials for the server (see `server/.env.example`).
2. Point the app at the API: set `EXPO_PUBLIC_API_URL` when starting Metro
   (e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.10:3000 npx expo start` from `mobile/`).
3. A dev build is required (LiveKit ships native code):

```bash
cd mobile
npx expo run:ios        # requires Xcode
npx expo run:android    # requires Android SDK
```

## Background voice during BGMI

While a guest is connected the app keeps the call alive in the background:

- **iOS** — `UIBackgroundModes: ["audio"]` (see `mobile/app.config.ts`), squawk
  `playAndRecord`/`voiceChat` when the mic is on and `playback`/`spokenAudio`
  mixed with others when listening only, so BGMI keeps its own volume.
- **Android** — a `microphone|mediaPlayback` foreground service with an
  ongoing notification starts on connect (mic type) or for listen-only guests
  (media type) and stops on leave/disconnect. `POST_NOTIFICATIONS` is requested
  on Android 13+ before the service starts. The service declaration and
  permissions are added by `mobile/plugins/withCallForegroundService.ts`.

Physical-device checks (BGMI handoff, routes, reconnects, notifications) are
tracked in `mobile/docs/device-test-matrix.md` — do not treat simulator runs as
evidence for this feature.
