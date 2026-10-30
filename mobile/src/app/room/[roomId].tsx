/* eslint-disable @typescript-eslint/no-require-imports, import/first */
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Platform } from 'react-native';

const NativeLiveKitRoomDriver =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? (require('@/features/room/livekit-room-driver') as { NativeLiveKitRoomDriver: new (...args: any[]) => any }).NativeLiveKitRoomDriver
    : (class {
        connect() { return Promise.resolve(); }
        disconnect() { return Promise.resolve(); }
        setMicrophoneEnabled() { return Promise.resolve(); }
        setRemoteVolume() {}
        subscribe() { return () => {}; }
      } as any);
import { RoomScreen } from '@/features/room/RoomScreen';
import { RoomConnection } from '@/features/room/room-connection';
import { useRoomSession } from '@/features/room/RoomSessionContext';

export default function RoomRoute() {
  const params = useLocalSearchParams<{ roomId?: string | string[] }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] ?? '' : params.roomId ?? '';
  const { session, clearSession } = useRoomSession();
  const [connection] = useState(() => new RoomConnection(new NativeLiveKitRoomDriver()));
  const [snapshot, setSnapshot] = useState(connection.getSnapshot());

  useEffect(() => {
    if (!session || session.credentials.roomId !== roomId) {
      return;
    }

    const unsubscribe = connection.subscribe(setSnapshot);
    void connection.connect(session.credentials).catch(() => undefined);

    return () => {
      unsubscribe();
      void connection.disconnect().finally(() => connection.dispose());
    };
  }, [connection, roomId, session]);

  if (!session || session.credentials.roomId !== roomId) {
    return <Redirect href="/" />;
  }

  const leaveRoom = () => {
    clearSession();
    router.replace('/');
  };

  return <RoomScreen connection={connection} snapshot={snapshot} onLeave={leaveRoom} roomId={roomId} inviteLink={session.inviteLink} />;
}
