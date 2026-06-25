import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AdminNotificationRecord } from '@/constants/adminMockData';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { getFirebaseFirestore } from '@/lib/firebase';
import {
  listAdminNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/firestore/adminNotificationService';

type AdminNotificationsContextValue = {
  isReady: boolean;
  items: AdminNotificationRecord[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AdminNotificationsContext = createContext<AdminNotificationsContextValue | null>(null);

export function AdminNotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady: authReady } = useAdminAuth();
  const [isReady, setIsReady] = useState(false);
  const [items, setItems] = useState<AdminNotificationRecord[]>([]);

  const refresh = useCallback(async () => {
    const db = await getFirebaseFirestore();
    if (!db) {
      setIsReady(true);
      return;
    }

    const remote = await listAdminNotifications().catch(() => [] as AdminNotificationRecord[]);
    setItems(remote);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isAuthenticated) {
      setItems([]);
      setIsReady(true);
      return;
    }

    void refresh();
  }, [authReady, isAuthenticated, refresh]);

  const markRead = useCallback(async (id: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    await markNotificationRead(id);
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    await markAllNotificationsRead();
  }, []);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  const value = useMemo(
    () => ({ isReady, items, unreadCount, markRead, markAllRead, refresh }),
    [isReady, items, unreadCount, markRead, markAllRead, refresh],
  );

  return (
    <AdminNotificationsContext.Provider value={value}>{children}</AdminNotificationsContext.Provider>
  );
}

export function useAdminNotifications() {
  const context = useContext(AdminNotificationsContext);
  if (!context) {
    throw new Error('useAdminNotifications must be used within AdminNotificationsProvider');
  }
  return context;
}
