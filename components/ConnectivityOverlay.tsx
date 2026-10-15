import React, { useEffect } from 'react';

export const ConnectivityOverlay: React.FC = () => {

  useEffect(() => {
    const handleOnline = () => {
      window.dispatchEvent(new CustomEvent('app:sync-data'));
    };

    window.addEventListener('online', handleOnline);

    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return null;
};
