import assert from 'node:assert/strict';
import test from 'node:test';
import { formatNotificationSenderTitle } from './notificationFormatting';

test('puts a saved sender name and international phone together without parentheses', () => {
  assert.equal(
    formatNotificationSenderTitle('Ramiro Helder', '+244 928 809 030'),
    'Ramiro Helder +244 928 809 030',
  );
});

test('uses only the phone when the sender has no saved display name', () => {
  assert.equal(formatNotificationSenderTitle('Membro', '+244 928 809 030'), '+244 928 809 030');
});

test('normalizes international prefixes and removes parentheses', () => {
  assert.equal(
    formatNotificationSenderTitle('Ramiro Helder', '00 244 (928) 809 030'),
    'Ramiro Helder +244 928 809 030',
  );
});

test('does not invent a phone number when the sender profile has none', () => {
  assert.equal(formatNotificationSenderTitle('Ramiro Helder', 'Contacto'), 'Ramiro Helder');
});
