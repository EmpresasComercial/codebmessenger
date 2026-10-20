import { supabase } from './supabase';
import { logger } from './logger';

export const VAPID_PUBLIC_KEY = 'BB7OI7jz-WDgr7twGzs8Yl5q4YnY_efjp2jCAt47VFDxQ3xiJNFaItqKYcTkRKoBxWEiwVutuEumUaxzQSrA7C4';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registra o Service Worker no navegador
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    logger.error('pushNotifications', 'Erro ao registrar Service Worker:', error);
    return null;
  }
}

/**
 * Pede permissão e inscreve o usuário para receber notificações push
 */
export async function subscribeToPushNotifications(): Promise<{ success: boolean; message: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, message: 'Notificações push não são suportadas neste navegador.' };
  }

  try {
    // 1. Pedir permissão ao usuário
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Permissão de notificação não concedida.' };
    }

    // 2. Obter ou registrar Service Worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, message: 'Falha ao ativar o Service Worker.' };
    }

    // 3. Obter ou criar inscrição Push
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // 4. Extrair dados criptográficos da inscrição
    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return { success: false, message: 'Chaves de notificação inválidas.' };
    }

    // 5. Salvar a subscription no perfil do usuário (nucleo.webpush_subscription)
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await (supabase.rpc as any)('save_webpush_subscription_mcpn', {
        p_endpoint: endpoint,
        p_keys_p256dh: p256dh,
        p_keys_auth: auth,
        p_user_agent: navigator.userAgent,
      });
    }

    return { success: true, message: 'Notificações ativadas com sucesso!' };
  } catch (error: any) {
    logger.error('pushNotifications', 'Erro ao inscrever notificações push:', error);
    return { success: false, message: error.message || 'Erro ao ativar notificações.' };
  }
}

/**
 * Dispara uma notificação nativa de teste localmente
 */
export async function sendLocalTestNotification(title: string, body: string, url: string = '/perfil') {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.showNotification(title, {
        body,
        icon: '/logo_tegx.jfif',
        badge: '/logo_tegx.jfif',
        vibrate: [200, 100, 200] as any,
        data: { url },
      } as any);
    } else {
      new Notification(title, {
        body,
        icon: '/logo_tegx.jfif',
      });
    }
  } else if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      sendLocalTestNotification(title, body, url);
    }
  }
}

/**
 * Define o número no badge do ícone do PWA
 */
export async function setAppBadge(count?: number): Promise<void> {
  try {
    if ('setAppBadge' in navigator) {
      if (typeof count === 'number' && count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).setAppBadge();
      }
    }
  } catch (err) {
    logger.debug('pushNotifications', 'Badging API não suportada ou não permitida:', err);
  }
}

/**
 * Limpa o badge do ícone do PWA
 */
export async function clearAppBadge(): Promise<void> {
  try {
    if ('clearAppBadge' in navigator) {
      await (navigator as any).clearAppBadge();
    }
  } catch (err) {
    logger.debug('pushNotifications', 'Erro ao limpar badge:', err);
  }
}
