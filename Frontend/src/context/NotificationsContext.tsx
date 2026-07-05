import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchNotifications,
  markNotificationRead,
} from '../api/services';
import { useAuth } from './AuthContext';
import { useRealtime } from './RealtimeContext';
import type { AppNotification } from '../types';

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const { subscribe } = useRealtime();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const isAdmin = user?.role === 'ADMIN';

  const refresh = useCallback(async () => {
    if (!token || !isAdmin) {
      setNotifications([]);
      return;
    }
    try {
      setNotifications(await fetchNotifications(token));
    } catch {
      /* ignore transient errors */
    }
  }, [token, isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isAdmin) return;
    return subscribe((event) => {
      if (event.type === 'notification.created') {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === event.notification.id)) return prev;
          return [event.notification, ...prev];
        });
      }
    });
  }, [subscribe, isAdmin]);

  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      const updated = await markNotificationRead(token, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n)),
      );
    },
    [token],
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const value = useMemo(
    () => ({ notifications, unreadCount, refresh, markRead }),
    [notifications, unreadCount, refresh, markRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      'useNotifications must be used within NotificationsProvider',
    );
  }
  return ctx;
}
