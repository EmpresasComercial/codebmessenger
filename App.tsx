/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import Layout from './components/Layout';
import { LanguageSelector } from './components/LanguageSelector';
import { ToastProvider } from './components/Toast';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PresenceProvider } from './contexts/PresenceContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ConnectivityOverlay } from './components/ConnectivityOverlay';
import { registerServiceWorker, subscribeToPushNotifications, clearAppBadge } from './lib/pushNotifications';
import { LoadingProvider } from './contexts/LoadingContext';
import { GlobalLoadingIndicator } from './components/GlobalLoadingIndicator';
import { getInviteCode } from './lib/inviteCode';

/* ── Lazy imports ─────────────────────────────────────────────────────────── */
// Critical path: carregadas no pacote principal (sem lazy)
import Login    from './pages/Login';
import Messager from './pages/Messager';

const Bots             = lazy(() => import('./pages/Bots'));
const Invite           = lazy(() => import('./pages/contactos'));
const Profile          = lazy(() => import('./pages/Profile'));
const AddBank          = lazy(() => import('./pages/AddBank'));
const Playmentbot      = lazy(() => import('./pages/paymentbot'));
const Wallet           = lazy(() => import('./pages/wallet'));
const AboutUs          = lazy(() => import('./pages/About'));
const HelpFAQ          = lazy(() => import('./pages/HelpFAQ'));
const ChatsHome        = lazy(() => import('./pages/ChatsHome'));
const GrupoChat        = lazy(() => import('./pages/grupochat'));
const PrivateChat      = lazy(() => import('./pages/PrivateChat'));
const DevicesPrivacy   = lazy(() => import('./pages/DevicesPrivacy'));
const PrivacyPolicy    = lazy(() => import('./pages/PrivacyPolicy'));
const AndrewNicolan    = lazy(() => import('./pages/andrewnicolan'));
const DownloadApp      = lazy(() => import('./pages/DownloadApp'));

/* ── Skeleton global de transição (Telegram-style) ─────────────────────────── */
function PageSkeleton() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f1f1f2', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <style>{`
        @keyframes __shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .ps { background: linear-gradient(90deg, #ebebeb 0%, #f5f5f5 40%, #ebebeb 100%); background-size: 200% 100%; animation: __shimmer 1s ease-in-out infinite; will-change: background-position; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: '#2481cc', height: 56, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12 }}>
        <div className="ps" style={{ width: 28, height: 28, borderRadius: '50%', opacity: 0.5 }} />
        <div className="ps" style={{ width: 140, height: 18, borderRadius: 4, opacity: 0.5 }} />
        <div style={{ flex: 1 }} />
        <div className="ps" style={{ width: 28, height: 28, borderRadius: '50%', opacity: 0.4 }} />
      </div>

      {/* Search bar */}
      <div style={{ background: '#fff', padding: '8px 12px', borderBottom: '1px solid #ebeef2' }}>
        <div className="ps" style={{ width: '100%', height: 36, borderRadius: 4 }} />
      </div>

      {/* Chat list rows */}
      {[0,1,2,3,4,5,6,7].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <div className="ps" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="ps" style={{ width: `${120 + (i % 3) * 30}px`, height: 14, borderRadius: 3 }} />
              <div className="ps" style={{ width: 36, height: 11, borderRadius: 3 }} />
            </div>
            <div className="ps" style={{ width: `${60 + (i % 4) * 40}%`, height: 12, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RootRedirect() {
  const { session, ready } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteCode = getInviteCode(searchParams);

  if (!ready) return null;
  if (session) return <Navigate to="/conversas" replace />;
  if (inviteCode) return <Navigate to={`/signup?ref=${encodeURIComponent(inviteCode)}`} replace />;
  return <Navigate to="/signup" replace />;
}

function GlobalLanguageSelector() {
  const { pathname } = useLocation();
  const { showLanguageSelector } = useLanguage();

  const normalizedPath = pathname.toLocaleLowerCase();
  const firstSegment = normalizedPath.split('/').filter(Boolean)[0] ?? '';
  const alwaysVisibleRoutes = new Set(['signin', 'signup', 'login', 'entrar']);
  const alwaysHiddenRoutes = new Set([
    'org',
    'conversas',
    'chat',
    'privado',
    'grupo',
    'web',
    'webgrupo',
    'chat-comunidade',
    'comunidade-chat',
    'grupochat',
    'conversas',
    'botfather',
    'bot-pay',
    'resgate',
    'minhas-compras',
    'wallet',
    'carteira',
    'retirada',
    'registro-retirada',
    'pagamento',
    'sand-pay',
    'recarregar',
    'playmentbot',
    'registro-recarga',
    'confirmar-recarga',
    'paymoney',
    'paveldurov',
    'canais',
    'canal',
    'perfil',
    'sessoes-ativas',
  ]);

  if (alwaysVisibleRoutes.has(firstSegment)) {
    return <LanguageSelector className="fixed right-3 top-3 z-[9998] rounded-md bg-white/90 shadow-sm" variant="bordered" />;
  }
  if (alwaysHiddenRoutes.has(firstSegment) || !showLanguageSelector) return null;

  return <LanguageSelector className="fixed right-3 top-3 z-[9998] rounded-md bg-white/90 shadow-sm" variant="bordered" />;
}

/* ── App ──────────────────────────────────────────────────────────────────── */
export default function App() {
  React.useEffect(() => {
    document.title = 'Business Messenger';

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    clearAppBadge();

    const handleClearBadgeOnFocus = () => {
      if (document.visibilityState === 'visible') clearAppBadge();
    };
    window.addEventListener('focus', handleClearBadgeOnFocus);
    document.addEventListener('visibilitychange', handleClearBadgeOnFocus);

    registerServiceWorker().then(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        subscribeToPushNotifications();
      }
    });

    const iconUrl = '/logo_bussiness_messeger.jpg?v=3';
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.type = 'image/jpeg';
    link.href = iconUrl;

    let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleLink) { appleLink = document.createElement('link'); appleLink.rel = 'apple-touch-icon'; document.head.appendChild(appleLink); }
    appleLink.href = iconUrl;

    return () => {
      window.removeEventListener('focus', handleClearBadgeOnFocus);
      document.removeEventListener('visibilitychange', handleClearBadgeOnFocus);
    };
  }, []);

  return (
    <LanguageProvider>
      <LoadingProvider>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <PresenceProvider>
                <ConnectivityOverlay />
                <GlobalLoadingIndicator />
                <GlobalLanguageSelector />
                <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/"         element={<RootRedirect />} />
                  <Route path="/signup"  element={<Messager />} />
                  <Route path="/signin"  element={<Login />} />
                  <Route path="/android"  element={<DownloadApp />} />
                  <Route path="/download-apk" element={<Navigate to="/android?setln=pt" replace />} />
                  <Route path="/privacidade" element={<PrivacyPolicy />} />
                  <Route path="/sessoes-ativas" element={<ProtectedRoute><DevicesPrivacy /></ProtectedRoute>} />

                  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    {/* Rotas Simplificadas Oficiais */}
                    <Route path="Sobre"                  element={<AboutUs />} />
                    <Route path="Banco"                  element={<AddBank />} />
                    <Route path="Senha"                  element={<Navigate to="/botfather?command=%2Fsenha" replace />} />
                    <Route path="conversas"              element={<ChatsHome />} />
                    <Route path="Contactos"              element={<Invite />} />
                    <Route path="Dispositivos"           element={<Navigate to="/sessoes-ativas" replace />} />
                    <Route path="grupo"                  element={<GrupoChat />} />
                    <Route path="Ajuda"                  element={<HelpFAQ />} />
                    <Route path="Canal"                  element={<AndrewNicolan />} />
                    <Route path="Perfil"                 element={<AndrewNicolan />} />
                    <Route path="Pagamento"              element={<Playmentbot />} />
                    <Route path="Privado"                element={<PrivateChat />} />
                    <Route path="Privado/:contactId"     element={<PrivateChat />} />
                    <Route path="Definições"             element={<Profile />} />
                    <Route path="carteira"               element={<Wallet />} />

                    {/* Alias e Redirecionamentos de Compatibilidade */}
                    <Route path="home"                    element={<Navigate to="/conversas" replace />} />
                    <Route path="botfather"               element={<Bots />} />
                    <Route path="bot-pay"                 element={<Navigate to="/botfather" replace />} />
                    <Route path="contactos"               element={<Invite />} />
                    <Route path="convite"                 element={<Navigate to="/Contactos" replace />} />
                    <Route path="definicoes"              element={<Profile />} />
                    <Route path="perfil"                  element={<AndrewNicolan />} />
                    <Route path="settings"                element={<Navigate to="/Definições" replace />} />
                    <Route path="bank"                   element={<AddBank />} />
                    <Route path="adicionar-banco"         element={<Navigate to="/bank" replace />} />
                    <Route path="alterar-senha"           element={<Navigate to="/botfather?command=%2Fsenha" replace />} />
                    <Route path="configuracoes-conta"     element={<Navigate to="/Definições" replace />} />
                    <Route path="sand-pay"                element={<Playmentbot />} />
                    <Route path="recarregar"              element={<Navigate to="/sand-pay" replace />} />
                    <Route path="playmentbot"             element={<Navigate to="/sand-pay" replace />} />
                    <Route path="suporte"                 element={<Navigate to="/conversas" replace />} />
                    <Route path="retirada"                element={<Navigate to="/carteira" replace />} />
                    <Route path="wallet"                  element={<Wallet />} />
                    <Route path="informacao-bancaria"     element={<Navigate to="/Definições" replace />} />
                    <Route path="registro-retirada"       element={<Navigate to="/carteira" replace />} />
                    <Route path="registro-recarga"        element={<Navigate to="/Pagamento" replace />} />
                    <Route path="registro-transnacionais" element={<Navigate to="/conversas" replace />} />
                    <Route path="registro-transacoes"     element={<Navigate to="/conversas" replace />} />
                    <Route path="historico-atividades"    element={<Navigate to="/conversas" replace />} />
                    <Route path="historico-geral"         element={<Navigate to="/conversas" replace />} />
                    <Route path="resgate"                 element={<Navigate to="/botfather" replace />} />
                    <Route path="minhas-compras"          element={<Navigate to="/botfather" replace />} />
                    <Route path="operacoes"               element={<Navigate to="/conversas" replace />} />
                    <Route path="sobre-business" element={<AboutUs />} />
                    <Route path="sobre-telegram business" element={<Navigate to="/sobre-business" replace />} />
                    <Route path="help-faq"                element={<HelpFAQ />} />
                    <Route path="suporte/feedback"        element={<Navigate to="/conversas" replace />} />
                    <Route path="provas-social"           element={<Navigate to="/conversas" replace />} />
                    <Route path="confirmar-recarga"       element={<Navigate to="/Pagamento" replace />} />
                    <Route path="payMoney"                element={<Navigate to="/Pagamento" replace />} />
                    <Route path="org"                    element={<Navigate to="/conversas" replace />} />
                    <Route path="telegramBussiness"       element={<Navigate to="/conversas" replace />} />
                    <Route path="telegramBusiness"        element={<Navigate to="/conversas" replace />} />
                    <Route path="telegram-business"       element={<Navigate to="/conversas" replace />} />
                    <Route path="web"                     element={<Navigate to="/grupo" replace />} />
                    <Route path="webgrupo"                element={<Navigate to="/grupo" replace />} />
                    <Route path="chat-comunidade"         element={<Navigate to="/grupo" replace />} />
                    <Route path="chat/comunidade"         element={<Navigate to="/grupo" replace />} />
                    <Route path="comunidade-chat"         element={<Navigate to="/grupo" replace />} />
                    <Route path="grupochat"               element={<Navigate to="/grupo" replace />} />
                    <Route path="chat/:contactId"         element={<PrivateChat />} />
                    <Route path="devices"                 element={<Navigate to="/sessoes-ativas" replace />} />
                    <Route path="telegram-premium"        element={<Navigate to="/Contactos" replace />} />
                    <Route path="premium"                 element={<Navigate to="/Contactos" replace />} />
                    <Route path="stars"                   element={<Navigate to="/botfather" replace />} />
                    <Route path="telegram-stars"          element={<Navigate to="/botfather" replace />} />
                    <Route path="canais"                  element={<AndrewNicolan />} />
                    <Route path="andrewnicolan"           element={<AndrewNicolan />} />
                    <Route path="pavelDurov"              element={<AndrewNicolan />} />
                    <Route path="pavel-durov"             element={<AndrewNicolan />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/signin" replace />} />
                </Routes>
              </Suspense>
              </PresenceProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </LoadingProvider>
    </LanguageProvider>
  );
}
