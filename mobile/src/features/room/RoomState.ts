export type RoomState =
  | 'idle'
  | 'creating'
  | 'joining'
  | 'connected'
  | 'connected_receive_only'
  | 'reconnecting'
  | 'error';

export function applyMicrophonePermission(state: RoomState, enabled: boolean): RoomState {
  if (state !== 'connected' && state !== 'connected_receive_only') {
    return state;
  }

  return enabled ? 'connected' : 'connected_receive_only';
}
