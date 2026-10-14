import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Check } from 'lucide-react';

export const ConnectivityOverlay: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showSyncSuccess, setShowSyncSuccess] = useState<boolean>(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      setShowSyncSuccess(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowSyncSuccess(true);
      // Dispara evento global de sincronizaÃ§Ã£o para todos os ouvintes do app
      window.dispatchEvent(new CustomEvent('app:sync-data'));
      const timer = setTimeout(() => {
        setShowSyncSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // MantÃ©m apenas o disparo do evento global, sem renderizar faixa flutuante
  return null;
};


