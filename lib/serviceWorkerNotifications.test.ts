import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const serviceWorkerSource = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function createPushHarness() {
  const listeners = new Map<string, (event: any) => void>();
  const notifications: Array<{ title: string; options: NotificationOptions }> = [];
  const self = {
    addEventListener: (name: string, listener: (event: any) => void) => listeners.set(name, listener),
    registration: {
      showNotification: async (title: string, options: NotificationOptions) => {
        notifications.push({ title, options });
      },
      getNotifications: async () => notifications,
    },
    clients: {},
    location: { origin: 'https://example.test' },
  };

  runInNewContext(serviceWorkerSource, {
    self,
    navigator: { setAppBadge: async () => {} },
    URL,
    console,
    caches: { open: async () => ({ addAll: async () => {} }), keys: async () => [] },
    fetch: async () => ({}),
  });

  return {
    notifications,
    async push(data: Record<string, unknown>) {
      let work: Promise<void> | undefined;
      listeners.get('push')?.({
        data: { json: () => data },
        waitUntil: (promise: Promise<void>) => { work = promise; },
      });
      assert.ok(work, 'push event should wait for notification delivery');
      await work;
      const notification = notifications.at(-1);
      assert.ok(notification, 'push event should display a notification');
      return notification;
    },
  };
}

test('formats legacy group-message payloads as sender title and message body', async () => {
  const harness = createPushHarness();
  const notification = await harness.push({
    title: 'BSN eMessaging',
    body: 'Ramiro Helder (244 928 809 030): [Documento]',
  });

  assert.equal(notification.title, 'Ramiro Helder +244 928 809 030');
  assert.equal(notification.options.body, '[Documento]');
  assert.equal(notification.options.badge, '/notification-badge.svg');
});

test('uses separated sender fields without repeating the old sender line', async () => {
  const harness = createPushHarness();
  const notification = await harness.push({
    title: 'BSN eMessaging',
    body: 'Ramiro Helder (24492809030): mensagem antiga',
    senderName: 'Lina',
    senderPhone: '00 244 923 111 222',
    message: 'Olá',
  });

  assert.equal(notification.title, 'Lina +244 923 111 222');
  assert.equal(notification.options.body, 'Olá');
});

test('leaves non-message notifications unchanged', async () => {
  const harness = createPushHarness();
  const notification = await harness.push({
    title: 'Teggram-X',
    body: 'Saldo atualizado',
  });

  assert.equal(notification.title, 'Teggram-X');
  assert.equal(notification.options.body, 'Saldo atualizado');
});
