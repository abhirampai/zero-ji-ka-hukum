# Device test matrix — background voice during BGMI

Recorded for plan Task 5, Step 6. Each check must be run with a **real
development build** (`npx expo run:ios` / `npx expo run:android`) on a physical
device. Simulator or Expo Go observations do not count as passing.

`zero-ji-ka-hukum` keeps the squad call alive while BGMI is foregrounded:
iOS relies on the `audio` background mode with a playAndRecord/voiceChat
recording policy; Android relies on a `microphone|mediaPlayback` foreground
service with an ongoing notification.

## Toolchain status (recorded 2026-10-30, updated after device-build work)

- iOS: Xcode 27.2 + CocoaPods 1.17.0 + iOS 27.2 simulator runtime installed;
  `npx expo run:ios` builds and runs on simulator. Physical-device install
  needs an Apple ID signing team (free account works for dev builds).
- Android: SDK/adb availability depends on the developer machine; install
  Android Studio + SDK to run `npx expo run:android`.
- Metro JS bundles for both platforms export successfully
  (`npx expo export --platform ios|android`).
- EAS cloud builds configured (`mobile/eas.json`); Android preview profile
  produces an APK, iOS uses the development profile.
- Generated native config verified via `npx expo prebuild --no-install`:
  iOS `UIBackgroundModes: [audio]`, `NSMicrophoneUsageDescription`; Android
  `RECORD_AUDIO`, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_MICROPHONE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`,
  `CAMERA` removed (`tools:node="remove"`), and
  `com.supersami.foregroundservice.ForegroundService` declared with
  `foregroundServiceType="microphone|mediaPlayback"` (`exported="false"`).

| # | Check | Device (model / OS) | Route | Mate | Expected | Result |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Join room with 4 guests, mic transmitting | — | — | — | status `Voice connected` | not run |
| 2 | Switch to BGMI; mic keeps transmitting to squad | — | — | — | teammates hear the player, no mic auto-mute | not run |
| 3 | Squad voice audible while BGMI plays audio | — | — | — | both streams audible, no harsh ducking | not run |
| 4 | Speaker route during call, then back to BGMI | — | — | — | routes switch cleanly | not run |
| 5 | Wired headset route | — | — | — | voice routes to headset | not run |
| 6 | Bluetooth (esp. gamemode headset) route | — | — | — | voice routes; recording stays stable | not run |
| 7 | Mute/unmute from room screen while in BGMI | — | — | — | mute state travels to squad | not run |
| 8 | Leave room, return to app | — | — | — | room drops when guest leaves | not run |
| 9 | Brief network loss (airplane toggle) mid-call | — | — | — | `Reconnecting…` then recovery or clear failure | not run |
| 10 | Microphone permission denied | — | — | — | `Connected · listening only` + Open Settings | not run |
| 11 | Android: ongoing call notification while backgrounded | — | — | — | notification appears during call | not run |
| 12 | Android: notification gone after leaving | — | — | — | notification disappears and service stops | not run |
| 13 | Android 13+: POST_NOTIFICATIONS request on first connect | — | — | — | permission prompt shown | not run |
| 14 | iOS: call survives ≈3 min BGMI foreground session | — | — | — | voice unaffected, no reconnect storm | not run |

## Known limitations to re-verify on device

- Android 14+ starts the microphone-type foreground service while the app is
  in the foreground (on connect). A guest whose mic permission is still denied
  runs the service with `mediaPlayback`; enabling the mic afterwards restarts
  the service with the `microphone` type.
- Denying the POST_NOTIFICATIONS prompt only suppresses the ongoing
  notification; the voice session continues.
- BGMI voice-channel mute should still be exercised by the player if the game
  brings its own comms; the app only guarantees its own audio routing.
