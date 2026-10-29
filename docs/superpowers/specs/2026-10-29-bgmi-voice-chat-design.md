# BGMI Friends Voice Chat — MVP Design

**Status:** Ready for user approval; no application code should be created until approved.

## Intent

Build a small, dependable voice-chat app for a BGMI squad of up to four friends. The motivating problem is that in-game communication has been unreliable for the group, especially for Apple users. Parallel is the reference for the core experience: voice chat should keep working while BGMI is in the foreground, and friends should still hear useful game audio.

## Goals

- Support players on iPhone and Android.
- Keep a voice room connected with the app in the background while the player uses BGMI in the foreground.
- Limit each room to four participants, including its creator.
- Make starting and joining a private squad quick.
- Provide reliable mute, leave, reconnect, and individual participant-volume controls.
- Keep the MVP focused on game voice chat rather than becoming a social network.

## Non-goals

- End-to-end encryption in the MVP. The user said privacy is not an MVP priority.
- Public lobby, persistent communities, or a friend/social graph.
- Text chat, video, screen sharing, music, mini-games, voice effects, or call recording.
- A browser/PWA implementation; background voice while BGMI is foregrounded is a core requirement, and a pure web app cannot reliably provide that behavior on iOS.
- A guarantee of zero latency. Network conditions, device audio routing, and game/device behavior affect call quality.

## Proposed MVP experience

1. A player opens the app and creates a room.
2. The app displays a shareable invite link and room code.
3. Friends join with a display name and the invite. The room rejects a fifth participant.
4. In the room, participants see who is connected and can mute/unmute themselves, adjust an individual friend's volume, or leave.
5. When a player switches to BGMI, the voice session continues in the background. Returning to the app shows the current room and connection state. Temporary network loss triggers a reconnect attempt and clear status feedback.

Guest display names and invite-based joining are the proposed low-friction MVP default; accounts and persistent friend lists are out of scope.

## Proposed technical approach

- **Mobile client:** Expo / React Native / TypeScript, using custom development builds and native modules/config plugins. Expo Go is not sufficient for validating the required native calling and background-audio behavior.
- **Voice transport:** LiveKit React Native SDK and a small LiveKit room for each squad. Use LiveKit Cloud for the MVP to avoid operating a real-time media fleet; this adds a recurring cost and vendor dependency.
- **Backend:** A small TypeScript service creates rooms and issues short-lived participant tokens. It enforces the four-participant limit and validates invite codes; clients must not be trusted to enforce the cap themselves.
- **Audio:** Configure iOS background audio/call behavior and Android microphone foreground-service behavior through native app configuration. Set audio behavior to coexist with other app audio where the OS permits, then validate actual game and voice levels on devices. Per-friend volume is applied client-side.
- **Baseline security:** Encrypted API traffic and WebRTC media transport (DTLS-SRTP); no end-to-end encryption in this MVP. The media service can process/relay audio. Use unguessable invite credentials and short-lived room tokens to reduce accidental or unauthorized joins.
- **Persistence:** No audio recording or transcript. Store only the minimum room state needed while a room is active; rooms expire after the call ends or after a short idle timeout.

## Constraints and risks

- Background microphone/audio behavior must be tested on physical iPhones and Android devices. Simulators and Expo Go cannot establish the core requirement.
- iOS audio-session configuration and App Store background-audio policy must match a legitimate ongoing voice call; background mode does not override iOS interruption, force-quit, or system behavior.
- Android requires the appropriate microphone foreground service and persistent OS notification during a background call.
- BGMI, Bluetooth/headset routing, device vendors, and OS versions may change audio mixing. Validate both voice clarity and game-audio audibility rather than assuming platform defaults work.
- LiveKit Cloud requires credentials, network access, and an acceptable service budget/region. A deployable MVP needs secrets supplied outside the client bundle.

## MVP acceptance checks

- A room creator and up to three invitees can exchange live two-way audio across iOS and Android.
- A fifth participant is rejected by the backend even if they attempt to bypass the client UI.
- After joining, a player can switch to BGMI and continue sending and receiving intelligible voice while the app is backgrounded; BGMI audio remains clearly audible without being muted or severely ducked on supported test devices.
- Mute/unmute, leave, individual remote-volume adjustment, and network reconnect work without restarting the room.
- The call works with the app foregrounded and backgrounded on real devices; unsupported states (permission denied, network loss, room full) are explained clearly.

## Confirmed MVP defaults

- Use Expo / React Native with native development builds, not a pure web app or Expo Go.
- Use LiveKit Cloud for the voice service, subject to supplying credentials and accepting its service cost.
- Let friends join as guests with a display name and invite; no accounts or persistent friend list in the MVP.
- Test on at least one physical iPhone and one physical Android device, checking that voice remains intelligible and BGMI audio remains clearly audible in the background-call scenario.
- Defer end-to-end encryption; use encrypted API and WebRTC transport, short-lived call tokens, and unguessable invites.

Everything else—screen styling, exact framework package versions, room-code format, idle timeout, deployment details, and component organization—is left to the builder, subject to the acceptance checks above.

## Approval gate

The user should review and approve this design before implementation planning or application/backend code begins.
