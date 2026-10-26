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
import PageSkeleton from './components/PageSkeleton';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import { getInviteCode } from './lib/inviteCode';
import { installChatNotificationAudioUnlock } from './lib/chatNotificationSound';

/* ── Lazy imports ─────────────────────────────────────────────────────────── */
const Login            = lazy(() => import('./pages/Login'));
const Messager         = lazy(() => import('./pages/Messager'));
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
const DownloadApp      = lazy(() => import('./pages/DownloadApp'));

function RootRedirect() {
  const { session, ready } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteCode = getInviteCode(searchParams);
  const hostname = window.location.hostname.toLowerCase();

  if (!ready) return <PageSkeleton />;
  if (hostname === 'chat.telegramas.cc') {
    return <Navigate to="/BaMnOpQ4rStU2vWxYz" replace />;
  }
  if (hostname === 'download.telegramas.cc') {
    return <Navigate to="/android?setln=pt" replace />;
  }
  if (session) return <Navigate to="/conversas" replace />;
  if (inviteCode) return <Navigate to={`/signup?ref=${encodeURIComponent(inviteCode)}`} replace />;
  return <Navigate to="/signup" replace />;
}

function InviteRedirect() {
  const [searchParams] = useSearchParams();
  const inviteCode = getInviteCode(searchParams);
  return <Navigate to={inviteCode ? `/signup?ref=${encodeURIComponent(inviteCode)}` : '/signup'} replace />;
}

function GlobalLanguageSelector() {
  const { pathname } = useLocation();
  const { showLanguageSelector } = useLanguage();

  const normalizedPath = pathname.toLocaleLowerCase();
  const firstSegment = normalizedPath.split('/').filter(Boolean)[0] ?? '';
  const alwaysVisibleRoutes = new Set(['signin', 'signup', 'login', 'entrar']);
  const alwaysHiddenRoutes = new Set([
    'conversas',
    'chat',
    'privado',
    'grupo',
    'bamnopq4rstu2vwxyz',
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
    document.title = 'Teggram-X';
    const removeChatAudioUnlock = installChatNotificationAudioUnlock();

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

    const iconUrl = '/pwa-icon-192.png';
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.type = 'image/png';
    link.href = iconUrl;

    let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleLink) { appleLink = document.createElement('link'); appleLink.rel = 'apple-touch-icon'; document.head.appendChild(appleLink); }
    appleLink.href = iconUrl;

    return () => {
      removeChatAudioUnlock();
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
                <RouteErrorBoundary>
                  <Suspense fallback={<PageSkeleton />}>
                    <Routes>
                  <Route path="/"         element={<RootRedirect />} />
                  <Route path="/t"         element={<InviteRedirect />} />
                  <Route path="/signup"  element={<Messager />} />
                  <Route path="/signin"  element={<Login />} />
                  <Route path="/android"  element={<DownloadApp />} />
                  <Route path="/download-apk" element={<Navigate to="/android?setln=pt" replace />} />
                  <Route path="/privacidade" element={<PrivacyPolicy />} />
                  <Route path="/sessoes-ativas" element={<ProtectedRoute><DevicesPrivacy /></ProtectedRoute>} />

                  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    {/* Rotas Simplificadas Oficiais */}
                    <Route path="/BaMnOpQ4rStU2vWxYz" element={<GrupoChat />} />
                    <Route path="Sobre"                  element={<AboutUs />} />
                    <Route path="Banco"                  element={<AddBank />} />
                    <Route path="Senha"                  element={<Navigate to="/botfather?command=%2Fsenha" replace />} />
                    <Route path="conversas"              element={<ChatsHome />} />
                    <Route path="Contactos"              element={<Invite />} />
                    <Route path="Dispositivos"           element={<Navigate to="/sessoes-ativas" replace />} />
                    <Route path="grupo"                  element={<Navigate to="/BaMnOpQ4rStU2vWxYz" replace />} />
                    <Route path="Ajuda"                  element={<HelpFAQ />} />
                    <Route path="Perfil"                 element={<Profile />} />
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
                    <Route path="perfil"                  element={<Profile />} />
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
                    <Route path="telegramBussiness"       element={<Navigate to="/conversas" replace />} />
                    <Route path="telegramBusiness"        element={<Navigate to="/conversas" replace />} />
                    <Route path="telegram-business"       element={<Navigate to="/conversas" replace />} />
                    <Route path="web"                     element={<Navigate to="/BaMnOpQ4rStU2vWxYz" replace />} />
                    <Route path="webgrupo"                element={<Navigate to="/BaMnOpQ4rStU2vWxYz" replace />} />
                    <Route path="chat-comunidade"         element={<Navigate to="/BaMnOpQ4rStU2vWxYz" replace />} />
                    <Route path="chat/comunidade"         element={<Navigate to="/BaMnOpQ4rStU2vWxYz" replace />} />
                    <Route path="comunidade-chat"         element={<Navigate to="/BaMnOpQ4rStU2vWxYz" replace />} />
                    <Route path="grupochat"               element={<Navigate to="/BaMnOpQ4rStU2vWxYz" replace />} />
                    <Route path="chat/:contactId"         element={<PrivateChat />} />
                    <Route path="devices"                 element={<Navigate to="/sessoes-ativas" replace />} />
                    <Route path="telegram-premium"        element={<Navigate to="/Contactos" replace />} />
                    <Route path="premium"                 element={<Navigate to="/Contactos" replace />} />
                    <Route path="stars"                   element={<Navigate to="/botfather" replace />} />
                    <Route path="telegram-stars"          element={<Navigate to="/botfather" replace />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/signin" replace />} />
                    </Routes>
                  </Suspense>
                </RouteErrorBoundary>
              </PresenceProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </LoadingProvider>
    </LanguageProvider>
  );
}
