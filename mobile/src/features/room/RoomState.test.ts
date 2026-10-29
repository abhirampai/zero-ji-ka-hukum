import { applyMicrophonePermission } from './RoomState';

describe('applyMicrophonePermission', () => {
  it('moves a connected guest to receive-only when microphone permission is denied', () => {
    expect(applyMicrophonePermission('connected', false)).toBe('connected_receive_only');
  });

  it('returns a receive-only guest to connected when microphone permission is granted', () => {
    expect(applyMicrophonePermission('connected_receive_only', true)).toBe('connected');
  });

  it('does not mark a non-connected room as connected', () => {
    expect(applyMicrophonePermission('joining', true)).toBe('joining');
  });
});
