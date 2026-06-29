import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { connectRealtimeStream } from '../api/realtime';
import { useAuth } from './AuthContext';
import type { RealtimeEvent } from '../types';

type RealtimeListener = (event: RealtimeEvent) => void;

interface RealtimeContextValue {
  connected: boolean;
  subscribe: (listener: RealtimeListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const listenersRef = useRef(new Set<RealtimeListener>());
  const [connected, setConnected] = useState(false);

  const subscribe = useCallback((listener: RealtimeListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      return;
    }

    const abort = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      try {
        await connectRealtimeStream(
          token,
          (event) => {
            listenersRef.current.forEach((listener) => listener(event));
          },
          abort.signal,
        );
      } catch {
        if (!abort.signal.aborted) {
          setConnected(false);
          retryTimer = setTimeout(() => void connect(), 3000);
        }
      }
    };

    setConnected(true);
    void connect();

    return () => {
      abort.abort();
      if (retryTimer) clearTimeout(retryTimer);
      setConnected(false);
    };
  }, [token]);

  const value = useMemo(
    () => ({ connected, subscribe }),
    [connected, subscribe],
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return ctx;
}

export function useRealtimeRefresh(
  onUpdate: (event: RealtimeEvent) => void,
  deps: unknown[] = [],
) {
  const { subscribe } = useRealtime();

  useEffect(() => {
    return subscribe(onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, ...deps]);
}
