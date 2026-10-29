import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { JoinRoomResponse } from '@bgmi/contracts';

export interface RoomSession {
  credentials: JoinRoomResponse;
  inviteLink: string;
}

interface RoomSessionContextValue {
  session: RoomSession | null;
  setSession(session: RoomSession): void;
  clearSession(): void;
}

const RoomSessionContext = createContext<RoomSessionContextValue | null>(null);

export function RoomSessionProvider({ children }: React.PropsWithChildren) {
  const [session, setSessionState] = useState<RoomSession | null>(null);
  const setSession = useCallback((nextSession: RoomSession) => setSessionState(nextSession), []);
  const clearSession = useCallback(() => setSessionState(null), []);
  const value = useMemo(
    () => ({ session, setSession, clearSession }),
    [session, setSession, clearSession],
  );

  return <RoomSessionContext.Provider value={value}>{children}</RoomSessionContext.Provider>;
}

export function useRoomSession(): RoomSessionContextValue {
  const value = useContext(RoomSessionContext);
  if (!value) {
    throw new Error('useRoomSession must be used within RoomSessionProvider');
  }
  return value;
}
