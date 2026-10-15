import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useToast } from '../components/Toast';

import { subscribeToPushNotifications } from '../lib/pushNotifications';

interface AuthContextType {
  session: Session | null;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, ready: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    // Safety timeout to prevent permanent white screen
    const timeout = setTimeout(() => {
      if (active) setReady(true);
    }, 5000);

    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!active) return;
        let currentSession = data.session;
        // Se o token salvo no localStorage ainda for o token antigo pesado (>5KB com base64)
        if (currentSession?.access_token && currentSession.access_token.length > 5000) {
          console.warn("Token antigo detectado com metadados pesados. Renovando sessão automaticamente...");
          const { data: refData, error: refErr } = await supabase.auth.refreshSession();
          if (!refErr && refData?.session) {
            currentSession = refData.session;
          } else {
            await supabase.auth.signOut();
            currentSession = null;
          }
        }
        if (!active) return;
        setSession(currentSession);
        if (currentSession && 'Notification' in window && Notification.permission === 'granted') {
          subscribeToPushNotifications();
        }
      })
      .catch(err => {
        console.error("Erro ao carregar sessão:", err);
      })
      .finally(() => {
        if (active) setReady(true);
        clearTimeout(timeout);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!active) return;
        setSession(currentSession);

        if (event === 'SIGNED_OUT') {
          showToast('Sessão expirada ou encerrada. Faça login novamente.', 'info');
          navigate('/login', { replace: true });
        }
        
        if (event === 'SIGNED_IN') {
          if ('Notification' in window && Notification.permission === 'granted') {
            subscribeToPushNotifications();
          }
          const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/messager' || window.location.pathname === '/cadastro';
          if (isAuthPage) {
            navigate('/org', { replace: true });
          }
        }
      }
    );

    return () => {
      active = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ session, ready }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
