// Service Worker para Business Messenger - Push Notifications & Offline Support
const CACHE_NAME = 'business-messenger-shell-v5';

// Assets fundamentais para o App abrir offline
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo_bussiness_messeger.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.debug('Erro ao pré-cachear assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepta requisições para permitir abertura 100% offline
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Não intercepta chamadas de API externas ou do Supabase (essas usam a rede / offline handling do app)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Requisição de navegação de páginas (HTML)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned));
          return response;
        })
        .catch(async () => {
          // Sem internet: entrega o index.html em cache para o SPA carregar e abrir normalmente
          const cached = await caches.match(req);
          if (cached) return cached;
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Arquivos estáticos locais (JS, CSS, Imagens, Fontes): Cache com fallback para rede
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Escuta eventos de Notificação Push
self.addEventListener('push', (event) => {
  let data = {
    title: 'Business Messenger',
    body: 'Você tem uma nova notificação na sua conta.',
    icon: '/logo_bussiness_messeger.jpg',
    badge: '/logo_bussiness_messeger.jpg',
    url: '/perfil',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo_bussiness_messeger.jpg',
    badge: data.badge || '/logo_bussiness_messeger.jpg',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'business-messenger-notification',
    renotify: true,
    data: {
      url: data.url || '/perfil',
    },
    actions: [
      {
        action: 'open',
        title: 'Ver no App',
      },
    ],
  };

  event.waitUntil(
    (async () => {
      // 1. Exibe a notificação push
      await self.registration.showNotification(data.title, options);

      // 2. Incrementa o número no badge do ícone do PWA
      try {
        if ('setAppBadge' in navigator) {
          const notifications = await self.registration.getNotifications();
          const count = Math.max(1, notifications.length);
          await navigator.setAppBadge(count);
        }
      } catch (err) {
        console.debug('Badge API error:', err);
      }
    })()
  );
});

// Ao clicar na notificação, abre o app direto na tela correspondente
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Limpa o badge do ícone do PWA
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }

  const rawUrl = event.notification.data?.url || '/perfil';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Se o app já estiver aberto em alguma aba/PWA, navega até a tela e traz para foco
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // 2. Se o app estiver fechado no celular, abre direto na página da notificação
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
