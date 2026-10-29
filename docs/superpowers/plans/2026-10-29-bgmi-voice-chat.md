# BGMI Squad Voice MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Expo iOS/Android app and minimal service that let up to four friends share low-latency voice while BGMI is foregrounded, with background audio, mute, individual volume, and reconnect controls.

**Architecture:** A small TypeScript workspace contains the Expo mobile app, shared Zod API contracts, and a Fastify backend. The backend uses LiveKit Cloud to create audio-only rooms capped at four and issues short-lived guest tokens; the mobile app uses the LiveKit React Native SDK in a custom development build with native background-audio configuration.

**Tech Stack:** Expo / React Native / TypeScript, Expo Router, LiveKit React Native SDK, LiveKit Cloud, Fastify, Zod, Vitest, Jest with `jest-expo`.

**Spec:** `docs/superpowers/specs/2026-10-29-bgmi-voice-chat-design.md`

## Global Constraints

- Support players on iPhone and Android.
- Keep a voice room connected with the app in the background while the player uses BGMI in the foreground.
- Limit each room to four participants, including its creator.
- Use guest joining with a display name and invite; no account or persistent friend list.
- Use LiveKit Cloud; never put LiveKit API secrets in the mobile app.
- Use encrypted API traffic and WebRTC media transport (DTLS-SRTP); do not implement end-to-end encryption in the MVP.
- Do not implement a public lobby, persistent communities, text chat, video, screen sharing, music, mini-games, voice effects, or call recording.
- Use Expo custom development builds; Expo Go is not sufficient for validating native calling and background audio.
- Verify on at least one physical iPhone and one physical Android device.
- Do not promise zero latency; verify intelligible voice and clearly audible game audio on supported test devices.

## Review Focus

- **A fifth or simultaneous fifth join:** LiveKit must never admit a fifth connected participant; tested in Task 2 for full-room rejection and configured room limits, and in Task 4 for mapping a capacity rejection from a racing join.
- **Invalid, expired, or unknown invite:** must not issue a LiveKit token; tested in Task 2 and surfaced in Task 3.
- **Microphone permission denied or revoked:** the app must clearly show that the user is receive-only until microphone access is restored, with an actionable Settings path; tested in Task 4.
- **App switch to BGMI, audio interruption, or headset route change:** voice should remain active where the OS permits, with game audio still audible; validated on physical devices in Task 5.
- **Brief network loss:** the app must show reconnecting, recover the room when possible, and provide a clear failure state otherwise; tested in Task 4 and on devices in Task 5.

---

## File Structure

- `package.json` — npm workspace membership and root verification scripts.
- `packages/contracts/src/room.ts` — shared request/response Zod schemas and inferred TypeScript types.
- `packages/contracts/vitest.config.ts` — shared contract test configuration.
- `server/src/app.ts` — Fastify app construction and dependency injection for tests.
- `server/vitest.config.ts` — API test configuration.
- `server/src/routes/rooms.ts` — HTTP validation and room error mapping.
- `server/src/rooms/room-service.ts` — room IDs, invite lifecycle, capacity checks, and token issuance policy.
- `server/src/livekit/livekit-admin.ts` — adapter around LiveKit Cloud room and participant APIs.
- `server/src/config.ts` — validated server-only environment configuration.
- `mobile/app.config.ts` — app scheme, microphone strings, LiveKit config plugins, and native background configuration.
- `mobile/jest.config.js` — `jest-expo` test configuration.
- `mobile/plugins/withCallForegroundService.ts` — Expo config plugin for the Android in-call microphone foreground service and manifest declarations.
- `mobile/src/app/_layout.tsx` — Expo Router shell and LiveKit native initialization.
- `mobile/src/app/index.tsx` — create-room and enter-invite home screen.
- `mobile/src/app/join/[roomId].tsx` — guest display-name confirmation and join state.
- `mobile/src/app/room/[roomId].tsx` — active-call screen and call controls.
- `mobile/src/api/room-api.ts` — typed calls to the backend.
- `mobile/src/features/room/room-connection.ts` — LiveKit connect, reconnect, mute, and disconnect operations.
- `mobile/src/platform/call-foreground-service.ts` — start/stop the Android ongoing-call foreground service.
- `mobile/src/features/room/ParticipantRow.tsx` — participant identity and individual volume control.
- `README.md`, `server/.env.example`, and `mobile/.env.example` — local setup, server-only secrets, development builds, and device-test instructions.

## Task 1: Bootstrap the Expo and TypeScript Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `mobile/` from the Expo Router TypeScript template
- Modify: `mobile/app.json` — set displayed name, slug, and scheme to `zero-ji-ka-hukum`; target iOS and Android only.
- Create: `server/package.json`, `server/tsconfig.json`, and `server/src/index.ts`
- Create: `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, and `packages/contracts/src/index.ts`
- Create: `packages/contracts/vitest.config.ts`
- Create: `server/vitest.config.ts`
- Create: `mobile/jest.config.js`
- Create: `mobile/eslint.config.js`
- Create: `mobile/test/style-mock.js`
- Create: `mobile/src/app/__tests__/home-screen.test.tsx`
- Create: `README.md`
- Create: `.gitignore`

**Interfaces:**
- Produces npm workspaces named `@bgmi/mobile`, `@bgmi/server`, and `@bgmi/contracts`.
- Produces root commands `npm run typecheck`, `npm test`, and `npm run lint` that run the corresponding workspace commands.

- [x] **Step 0: Commit the approved design and plan as the project baseline**

Run from `bgmi-voice-chat/`:

```bash
git add .gitignore docs/superpowers/specs docs/superpowers/plans
git commit -m "docs: add approved BGMI voice MVP design and plan"
```

- [x] **Step 1: Create the Expo Router TypeScript app and workspace package skeleton**

Run from `bgmi-voice-chat/`:

```bash
npx create-expo-app@latest mobile --template default
```

Add `server` and `packages/contracts` as npm workspaces without moving the approved design or plan documents. Keep Expo Router routes under `mobile/src/app/` per the project instructions.
Initialize Git in `bgmi-voice-chat/` only if it is not already inside an existing repository; do not reinitialize an existing repository. Keep generated `mobile/ios` and `mobile/android` projects ignored under Expo Continuous Native Generation.

- [x] **Step 2: Configure workspace scripts and TypeScript project references**

Set the root scripts to delegate typecheck, test, and lint to all workspaces; set workspace names exactly as listed above; configure Vitest for server/contracts and Jest with `jest-expo` for mobile; replace the generated demo tab routes with a simple root Stack and branded home placeholder; add a minimal server entrypoint and package exports for contracts.

- [x] **Step 3: Verify the scaffold**

Run: `npm install && npm run typecheck && npm run lint`

Expected: install completes; all three workspaces typecheck and lint without errors. Run `npx expo config --type public` from `mobile/` and confirm `name`, `slug`, and `scheme` resolve to `zero-ji-ka-hukum`, with `platforms` set to iOS and Android.

- [x] **Step 4: Commit the workspace scaffold**

```bash
git add package.json package-lock.json tsconfig.base.json eslint.config.mjs mobile server packages .gitignore docs/superpowers/specs docs/superpowers/plans
git commit -m "chore: bootstrap Expo voice chat workspace"
```

## Task 2: Define Contracts and Implement Room/Token API

**Files:**
- Modify: `package-lock.json`
- Modify: `server/package.json`
- Modify: `packages/contracts/package.json`
- Create: `packages/contracts/src/room.ts`
- Create: `packages/contracts/test/room.test.ts`
- Create: `server/src/config.ts`
- Create: `server/src/livekit/livekit-admin.ts`
- Create: `server/src/rooms/room-service.ts`
- Create: `server/src/routes/rooms.ts`
- Create: `server/src/app.ts`
- Create: `server/test/room-service.test.ts`
- Create: `server/test/rooms-routes.test.ts`
- Create: `server/test/config.test.ts`
- Modify: `server/src/index.ts`
- Create: `server/.env.example`

**Interfaces:**
- `CreateRoomResponse = { roomId: string }`.
- `JoinRoomRequest = { displayName: string }` where trimmed `displayName` has 1–24 characters.
- `JoinRoomResponse = { roomId: string; displayName: string; participantIdentity: string; serverUrl: string; token: string }`.
- `RoomService.createRoom(): Promise<CreateRoomResponse>`.
- `RoomService.joinRoom(roomId: string, displayName: string): Promise<JoinRoomResponse>`.
- `LiveKitAdmin.createRoom(roomName: string, maxParticipants: 4, emptyTimeoutSeconds: number): Promise<void>`.
- `LiveKitAdmin.getParticipantCount(roomName: string): Promise<number | null>` (`null` means the room does not exist) and `LiveKitAdmin.createParticipantToken(roomName: string, identity: string, displayName: string): Promise<string>`.
- HTTP: `POST /v1/rooms` creates a room; `POST /v1/rooms/:roomId/join` returns a guest token; `GET /healthz` returns `{ status: "ok" }`.
- Errors use `{ error: { code: string; message: string } }`; use HTTP 400 for invalid input, 404 for unknown/expired room, 409 for a full room, and 503 for LiveKit service failures.

- [x] **Step 1: Write failing contract tests**

Test that a trimmed 1-character display name is accepted; blank and 25-character names are rejected; room IDs match the 22-character base64url encoding of 128 random bits; create/join responses require all listed fields.

- [x] **Step 2: Run the contract tests and verify they fail**

Run: `npm test --workspace @bgmi/contracts`

Expected: FAIL because the room schemas and exports do not exist.

- [x] **Step 3: Implement and export Zod request/response schemas**

Keep error and room contracts in `packages/contracts/src/room.ts`; export inferred types from `src/index.ts`.

- [x] **Step 4: Run contract tests and verify they pass**

Run: `npm test --workspace @bgmi/contracts`

Expected: PASS for valid/invalid display names, URL-safe room IDs, and required response fields.

- [x] **Step 5: Write failing room-service and route tests**

Use a fake `LiveKitAdmin` to assert room creation sets `maxParticipants` to exactly 4 and a 10-minute empty timeout; when four participants are already connected, another join receives `room_full`; an unknown room receives `room_not_found`; no token is issued for rejected joins; successful guest tokens permit microphone publish and subscribe but not camera publish. Test Fastify routes for the stated status codes and response schemas. Test that server configuration fails without credentials and accepts only secure WebSocket LiveKit URLs.

- [x] **Step 6: Run server tests and verify they fail**

Run: `npm test --workspace @bgmi/server`

Expected: FAIL because room service and routes are not implemented.

- [x] **Step 7: Implement the LiveKit adapter, service, and Fastify routes**

Generate room IDs with `crypto.randomBytes(16).toString("base64url")` and use them as unguessable invite credentials/LiveKit room names. Configure LiveKit's own room maximum as 4 to enforce the cap even when joins race; perform a participant-count pre-check for a friendly 409 response. A simultaneous race may issue two valid tokens for one remaining slot, but LiveKit must reject the excess connection; map that connection failure to `room_full` in Task 4. Treat a null participant-count result as an unknown/expired room and return 404. Return only `roomId` from the create API; the mobile app constructs its invite with `Linking.createURL("/join/<roomId>")` using the `zero-ji-ka-hukum` scheme. Load `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` only in the server process; issue audio-only participant tokens that expire after 10 minutes.

- [x] **Step 8: Run server and contract suites**

Run: `npm test --workspace @bgmi/contracts && npm test --workspace @bgmi/server && npm run typecheck`

Expected: all tests pass; the client-facing response never contains LiveKit API credentials.

- [ ] **Step 9: Commit the room API**

```bash
git add package-lock.json packages/contracts server docs/superpowers/plans/2026-10-29-bgmi-voice-chat.md
git commit -m "feat: add four-person LiveKit room API"
```

## Task 3: Build Guest Create/Join Flow in Expo

**Files:**
- Create: `mobile/src/api/room-api.ts`
- Create: `mobile/src/api/room-api.test.ts`
- Create: `mobile/src/app/index.tsx`
- Create: `mobile/src/app/join/[roomId].tsx`
- Create: `mobile/src/features/room/JoinRoomForm.tsx`
- Create: `mobile/src/features/room/JoinRoomForm.test.tsx`
- Create: `mobile/src/features/room/RoomState.ts`
- Create: `mobile/src/features/room/RoomState.test.ts`
- Modify: `mobile/src/app/_layout.tsx`

**Interfaces:**
- `RoomApi.createRoom(): Promise<CreateRoomResponse>`.
- `RoomApi.joinRoom(roomId: string, displayName: string): Promise<JoinRoomResponse>`.
- `RoomState = "idle" | "creating" | "joining" | "connected" | "connected_receive_only" | "reconnecting" | "error"`.
- Consumes shared `@bgmi/contracts` schemas from Task 2; produces typed room credentials for Task 4.

- [ ] **Step 1: Write failing API-client tests**

Test that create and join requests use the `/v1` endpoints, send JSON, parse valid responses, and surface typed room-full, invalid-invite, and service-error responses without exposing token details in user-facing error text. Test that the invite URI is constructed from the configured scheme and `/join/<roomId>` path.

- [ ] **Step 2: Run API-client tests and verify they fail**

Run: `npm test --workspace @bgmi/mobile -- room-api`

Expected: FAIL because `RoomApi` does not exist.

- [ ] **Step 3: Implement the typed API client**

Read the API base URL from `EXPO_PUBLIC_API_URL`; validate responses with shared schemas and map known error codes to typed errors.

- [ ] **Step 4: Write failing room-state and form tests**

Test display-name trimming/validation, create/join loading states, a full-room error, an invalid invite error, and the transition from `connected` to `connected_receive_only`. Assert no join request is made for a blank display name.

- [ ] **Step 5: Run app tests and verify they fail**

Run: `npm test --workspace @bgmi/mobile -- JoinRoomForm`

Expected: FAIL because join screens and state transitions are not implemented.

- [ ] **Step 6: Implement home, invite join, and room-state UI**

Add create-room and join-code entry on the home screen. Build the share URI with Expo Linking's `createURL` for `/join/<roomId>` and the configured `zero-ji-ka-hukum` scheme; show a share action and a copyable room ID. Handle that deep link in `src/app/join/[roomId].tsx` and let the guest enter a display name. Once connected, request microphone permission and publish audio; if permission is denied, stay in the room receive-only and show an actionable Settings path. Display clear room-full, unknown-invite, network, and microphone-permission states.

- [ ] **Step 7: Run mobile tests and static checks**

Run: `npm test --workspace @bgmi/mobile && npm run typecheck && npm run lint`

Expected: PASS; app routes handle create/join success and error states.

- [ ] **Step 8: Commit create/join flow**

```bash
git add mobile
git commit -m "feat: add guest room create and join flow"
```

## Task 4: Integrate LiveKit Voice and Call Controls

**Files:**
- Create: `mobile/src/features/room/room-connection.ts`
- Create: `mobile/src/features/room/room-connection.test.ts`
- Create: `mobile/src/features/room/RoomScreen.tsx`
- Create: `mobile/src/features/room/RoomScreen.test.tsx`
- Create: `mobile/src/features/room/ParticipantRow.tsx`
- Modify: `mobile/src/app/room/[roomId].tsx`
- Modify: `mobile/src/app/_layout.tsx`

**Interfaces:**
- `RoomConnection.connect(credentials: JoinRoomResponse): Promise<void>`.
- `RoomConnection.setMicrophoneEnabled(enabled: boolean): Promise<void>`.
- `RoomConnection.setRemoteVolume(participantIdentity: string, volume: number): void`, with `volume` clamped to `[0, 1]`.
- `RoomConnection.disconnect(): Promise<void>`.
- `RoomConnection` emits room connection state and participants `{ identity: string; displayName: string; isMicrophoneEnabled: boolean }`.
  - `connect` connects and attempts to enable the local microphone; a denied permission leaves the participant connected receive-only and emits `connected_receive_only`.

- [ ] **Step 1: Write failing room-connection tests using a fake LiveKit room**

Test connect success/failure, disconnect, microphone toggle, participant updates, `reconnecting` state, per-participant volume clamping, a LiveKit capacity rejection mapped to `room_full`, and a microphone permission rejection mapped to a receive-only state; changing one participant's volume must not change another's.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test --workspace @bgmi/mobile -- room-connection`

Expected: FAIL because the room connection adapter does not exist.

- [ ] **Step 3: Add LiveKit Expo dependencies and native initialization**

Install `livekit-client`, `@livekit/react-native`, `@livekit/react-native-webrtc`, `@livekit/react-native-expo-plugin`, and `@config-plugins/react-native-webrtc` using `npx expo install`; register WebRTC globals once during app initialization and start/stop the LiveKit audio session with room lifecycle.

- [ ] **Step 4: Implement the room connection adapter**

Connect only with server-issued credentials; publish microphone audio and subscribe to remote audio. Do not request or publish camera tracks. Map SDK state/events to the declared room state and participant interface; apply per-track remote volume independently.

- [ ] **Step 5: Write failing room-screen tests**

Test that the screen lists connected participants, shows mute/unmute state, toggles local mic, calls individual volume controls, and disconnects on leave. When mic permission is denied, verify the screen remains clearly receive-only and presents a Settings path. Include the creator plus three invitees and a participant reconnecting.

- [ ] **Step 6: Implement room screen and controls**

Build a focused call UI with connection status, participant rows, per-person volume sliders, one local mute control, and leave. Avoid adding lobby, chat, video, or other social features.

- [ ] **Step 7: Run mobile tests and static checks**

Run: `npm test --workspace @bgmi/mobile && npm run typecheck && npm run lint`

Expected: PASS, including participant-isolated volume and reconnect state tests.

- [ ] **Step 8: Commit voice integration and controls**

```bash
git add mobile
git commit -m "feat: add LiveKit voice room controls"
```

## Task 5: Configure Background Audio and Validate BGMI Handoff

**Files:**
- Create: `mobile/app.config.ts`
- Modify: `mobile/package.json`
- Modify: `mobile/src/features/room/room-connection.ts`
- Create: `mobile/src/platform/call-foreground-service.ts`
- Create: `mobile/src/platform/call-foreground-service.test.ts`
- Create: `mobile/plugins/withCallForegroundService.ts`
- Create: `mobile/plugins/withCallForegroundService.test.ts`
- Create: `mobile/app.config.test.ts`
- Create: `mobile/docs/device-test-matrix.md`
- Modify: `README.md`

**Interfaces:**
- Consumes `RoomConnection` from Task 4; no new public client API.
- Native config must enable the iOS audio background mode and the Android microphone foreground service with the required persistent notification while a call is active.
- `CallForegroundService.start(): Promise<void>` and `CallForegroundService.stop(): Promise<void>`; room connect/disconnect starts/stops it on Android only.

- [ ] **Step 1: Verify required generated native settings before changing them**

Run: `npx expo config --type prebuild` from `mobile/` and inspect the resolved app config/plugin inputs. Then run `npx expo prebuild --no-install` (without `--clean`) to generate ignored native projects and inspect the resulting iOS background modes, microphone usage description, Android permissions, and service declaration.

Expected: record missing settings; do not use a destructive clean-prebuild command.

- [ ] **Step 2: Add a config assertion/check for background audio settings**

Test the resolved app config so iOS includes the `audio` background mode and microphone usage description, and Android includes microphone permission, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`/`FOREGROUND_SERVICE_MICROPHONE`/`FOREGROUND_SERVICE_MEDIA_PLAYBACK`, and the foreground-service declaration with `microphone|mediaPlayback` types. Test that the Android service helper starts only for an active room and stops after disconnect, and that the config plugin adds the service and permissions to an Android manifest fixture.

- [ ] **Step 3: Run the config check and verify it fails for missing settings**

Run: `npm test --workspace @bgmi/mobile -- background-audio-config`

Expected: FAIL until native config is explicit.

- [ ] **Step 4: Implement platform audio configuration**

Create `mobile/app.config.ts` with the app scheme, microphone purpose string, LiveKit Expo plugins, and iOS `audio` background mode. Configure `@livekit/react-native-expo-plugin` with Android `audioType: "media"` to preserve game-audio volume, then call `AudioSession.configureAudio` before `AudioSession.startAudioSession` and connect. On iOS, disable automatic session setup and call `setupIOSAudioManagement` once with recording category `playAndRecord`, options `allowBluetooth` and `mixWithOthers`, mode `voiceChat`; use playout category `playback`, option `mixWithOthers`, mode `spokenAudio`. Do not add incoming-call/VoIP push behavior to this MVP. Add `@supersami/rn-foreground-service` and a local Expo config plugin to declare `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE`, and `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, plus its service with `microphone|mediaPlayback` types; start that service only while joined and stop it on leave/disconnect. Show an ongoing notification while the call is backgrounded. Request microphone permission and, on Android 13+, notification permission for the ongoing call notification.

- [ ] **Step 5: Run config checks and build development clients**

Run: `npm test --workspace @bgmi/mobile -- background-audio-config && npx expo run:ios && npx expo run:android`

Expected: config tests pass and development builds compile. If a platform toolchain/device is unavailable, record it as an external validation blocker rather than claiming the platform passed.

- [ ] **Step 6: Execute physical-device BGMI handoff checks**

On at least one physical iPhone and one physical Android device, join a room, switch to BGMI, and verify both local mic transmission and remote voice reception continue. Confirm BGMI audio remains clearly audible without severe ducking, then test speaker and available headset/Bluetooth routes, mute/unmute, app return, a brief network interruption, and OS permission denial. On Android, verify the persistent notification appears during the call and disappears after leaving. Record device model, OS version, route, result, and any limitation in `mobile/docs/device-test-matrix.md`.

- [ ] **Step 7: Fix failures and rerun the affected device checks**

For any failure, change the relevant native audio/session configuration or UI state, rerun app tests, rebuild the affected development client, and repeat the failed physical-device scenario. Do not mark background support complete based only on simulator or Expo Go behavior.

- [ ] **Step 8: Commit native audio configuration and test record**

```bash
git add mobile README.md
git commit -m "feat: configure background voice for gameplay"
```

## Task 6: Document Local Setup and Verify End-to-End MVP

**Files:**
- Create: `mobile/.env.example`
- Modify: `server/.env.example`
- Create: `server/test/health.test.ts`
- Modify: `README.md`
- Modify: root and workspace scripts as needed

**Interfaces:**
- Server environment: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `PORT`.
- Mobile environment: `EXPO_PUBLIC_API_URL` only; never include LiveKit API key or secret.
- Consumes the server API and app room flow from Tasks 2–5.

- [ ] **Step 1: Write a health-route test and a secret-boundary check**

Test `GET /healthz` returns `{ status: "ok" }`; add a source/config test that the mobile public environment schema contains no LiveKit secret or API key.

- [ ] **Step 2: Run tests and verify the health test fails**

Run: `npm test --workspace @bgmi/server -- health`

Expected: FAIL until the route is wired into the Fastify app.

- [ ] **Step 3: Implement health route and safe environment examples**

Provide placeholders only in `.env.example`; validate required server variables at startup and fail with a clear message if absent. Document that real credentials belong in the server environment/secrets manager, not source control or Expo public variables.

- [ ] **Step 4: Document setup and end-to-end test steps**

Document LiveKit Cloud project setup, API startup, mobile API URL configuration, custom development-build installation, invite flow, test suite commands, and the physical BGMI handoff matrix.

- [ ] **Step 5: Run the complete automated verification suite**

Run: `npm test && npm run typecheck && npm run lint`

Expected: all workspace tests, typechecks, and lint checks pass. Then run one end-to-end room with four real devices/users where available; verify a fifth join receives `room_full`.

- [ ] **Step 6: Commit setup documentation and final verification**

```bash
git add README.md server/.env.example mobile/.env.example server mobile package.json package-lock.json
git commit -m "docs: document BGMI voice MVP setup and validation"
```

## Self-Review

- **Spec coverage:** iOS/Android client and guest invite flow are covered by Tasks 1 and 3; four-person enforcement and short-lived audio-only tokens by Task 2; mute, per-person volume, leave, and reconnect by Task 4; background operation and game-audio coexistence by Task 5; no secrets in the app, operational setup, and end-to-end verification by Task 6. The spec's non-goal features are explicitly excluded in the global constraints and Task 4.
- **Review Focus coverage:** full-room and unknown-invite rejection are in Task 2; concurrent capacity rejection is covered by Tasks 2 and 4; permission-denied UI is in Task 4; network loss is in Tasks 4–5; background handoff and audio route behavior are physical checks in Task 5.
- **Type consistency:** shared contract names are consumed by `RoomApi`; its `JoinRoomResponse` is consumed by `RoomConnection.connect`; room connection participant identity keys are used by `ParticipantRow` volume controls.
- **Proportion:** six tasks follow the natural dependency order: workspace, API, join flow, audio call, native behavior, and release verification. No independent social or media subsystem is included.
