import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface PresenceContextType {
  onlineUserIds: Set<string>;
  isUserOnline: (userId: string | undefined | null) => boolean;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: new Set(),
  isUserOnline: () => false,
});

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const user = session?.user;
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setOnlineUserIds(new Set());
      return;
    }

    let active = true;
    const channel = supabase.channel('tg_online_presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const trackPresence = async () => {
      if (!active) return;
      try {
        const status = await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
        if (status !== 'ok') {
          console.error('[Presence] Could not publish online status:', status);
        }
      } catch (error) {
        console.error('[Presence] Could not publish online status:', error);
      }
    };

    const untrackPresence = async () => {
      try {
        const status = await channel.untrack();
        if (status !== 'ok') {
          console.error('[Presence] Could not clear online status:', status);
        }
      } catch (error) {
        console.error('[Presence] Could not clear online status:', error);
      }
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!active) return;
        const state = channel.presenceState();
        const activeIds = new Set<string>();
        Object.keys(state).forEach((key) => {
          activeIds.add(key);
        });
        setOnlineUserIds(activeIds);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (!active) return;
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (!active) return;
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (active && status === 'SUBSCRIBED' && navigator.onLine) {
          await trackPresence();
        }
      });

    const handleOnline = () => void trackPresence();
    const handleOffline = () => void untrackPresence();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      void supabase.removeChannel(channel).then((status) => {
        if (status !== 'ok') console.error('[Presence] Could not remove presence channel:', status);
      }).catch((error: unknown) => {
        console.error('[Presence] Could not remove presence channel:', error);
      });
    };
  }, [user?.id]);

  const isUserOnline = useMemo(() => {
    return (userId: string | undefined | null) => {
      if (!userId) return false;
      return onlineUserIds.has(userId);
    };
  }, [onlineUserIds]);

  return (
    <PresenceContext.Provider value={{ onlineUserIds, isUserOnline }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
