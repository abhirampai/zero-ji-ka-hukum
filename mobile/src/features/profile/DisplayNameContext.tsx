import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { clearDisplayName, loadDisplayName, saveDisplayName } from '@/storage/display-name';

interface DisplayNameContextValue {
  displayName: string | null;
  isReady: boolean;
  setDisplayName(name: string): Promise<void>;
  clearDisplayName(): Promise<void>;
}

const DisplayNameContext = createContext<DisplayNameContextValue | null>(null);

export function DisplayNameProvider({ children }: React.PropsWithChildren) {
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadDisplayName();
      if (!cancelled) {
        setDisplayNameState(stored);
        setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDisplayName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return;
    }
    await saveDisplayName(trimmed);
    setDisplayNameState(trimmed);
  }, []);

  const clear = useCallback(async () => {
    await clearDisplayName();
    setDisplayNameState(null);
  }, []);

  const value = useMemo(
    () => ({ displayName, isReady, setDisplayName, clearDisplayName: clear }),
    [displayName, isReady, setDisplayName, clear],
  );

  return <DisplayNameContext.Provider value={value}>{children}</DisplayNameContext.Provider>;
}

export function useDisplayName(): DisplayNameContextValue {
  const value = useContext(DisplayNameContext);
  if (!value) {
    throw new Error('useDisplayName must be used within DisplayNameProvider');
  }
  return value;
}
