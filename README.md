# zero-ji-ka-hukum

Cross-platform voice chat for BGMI squads of up to four players.

- `@bgmi/mobile` — Expo client (`mobile/`) with LiveKit voice, keep-alive in background.
- `@bgmi/server` — Fastify room/token API (`server/`).
- `@bgmi/contracts` — shared Zod schemas (`packages/contracts/`).

## Prerequisites

1. A **LiveKit Cloud** project (free tier is fine). Create it at
   https://cloud.livekit.io and copy the project URL plus an API key/secret
   from the project's settings.
2. Node 20+ and npm.
3. For device installs: Xcode (iOS) or Android Studio / SDK (Android), plus the
   physical devices you plan to test with.

## Server setup

```bash
cp server/.env.example server/.env   # then fill in real LiveKit credentials
npm install
npm run dev --workspace @bgmi/server # Fastify on :3000 (PORT overridable)
```

The server validates its environment at startup and fails fast with a clear
message if `LIVEKIT_URL`, `LIVEKIT_API_KEY`, or `LIVEKIT_API_SECRET` is missing
or malformed. `LIVEKIT_URL` must be `wss://…`. Real credentials belong in your
shell/secrets manager — never in commits, and never in any Expo public
variable. Guest phones only ever receive short-lived audio-only tokens issued
by the server.

## Mobile setup

```bash
npm install
npm test --workspace @bgmi/mobile   # Jest suites (run serially via --runInBand)
npm run typecheck && npm run lint
```

1. Point the app at the API: set `EXPO_PUBLIC_API_URL` when starting Metro
   (copy `mobile/.env.example` values):

   ```bash
   cd mobile
   npx expo start -c  # with EXPO_PUBLIC_API_URL exported in your shell
   ```

2. A dev build is required (LiveKit ships native code):

```bash
cd mobile
npx expo run:ios        # requires Xcode
npx expo run:android    # requires Android SDK
```

Install the resulting development build on each phone
(`ios/dev/…` / `.apk`), or use `eas build --profile development` for cloud
signing.

## End-to-end test run

1. Start the server and Metro (`npx expo start`), then launch the dev build on
   several phones.
2. Enter a display name, tap **Create room**; the room code and invite copy is
   generated. Squadmates pick **Join with code** (or open the
   `zero-ji-ka-hukum://join/<roomId>` deep link shared from the invite screen).
3. Grant microphone access when prompted. Room capacity is four; a fifth join
   receives the friendly "This room already has four players" error
   (HTTP 409 → `room_full`).
4. In-room controls: mute/unmute mic, per-person volume sliders, leave.
5. Background handoff: switch to BGMI — squad voice and mic continue
   (iOS audio background mode; Android foreground-service notification).
6. Record device checks in `mobile/docs/device-test-matrix.md` — do not treat
   simulator or Expo Go runs as evidence for background behavior.

## Background voice during BGMI

While a guest is connected the app keeps the call alive in the background:

- **iOS** — `UIBackgroundModes: ["audio"]` (see `mobile/app.config.ts`): the
  AVAudioSession runs `playAndRecord`/`voiceChat` when the mic is on, and
  `playback`/`spokenAudio` mixed with others when listening only, so BGMI keeps
  its own volume.
- **Android** — a `microphone|mediaPlayback` foreground service with an
  ongoing notification starts on connect (mic type) or for listen-only guests
  (media type) and stops on leave/disconnect. `POST_NOTIFICATIONS` is requested
  on Android 13+ before the service starts. The service declaration and
  permissions are added by `mobile/plugins/withCallForegroundService.ts`.

## Verification commands

```bash
npm test            # all workspace tests (mobile, server, contracts)
npm run typecheck   # all workspaces
npm run lint        # all workspaces
cd mobile && npx expo export --platform ios && npx expo export --platform android
```
