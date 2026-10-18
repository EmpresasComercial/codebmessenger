import assert from 'node:assert/strict';
import test from 'node:test';
import { maskSensitiveText } from './AutoTranslatedText';

test('masks recipient names and bank account values before translation and restores them locally', () => {
  const recipientName = 'Ana Maria da Silva';
  const iban = 'AO06 1234 5678 9012 3456 7890 1';
  const original = `Titular: ${recipientName}. IBAN: ${iban}.`;
  const masked = maskSensitiveText(original, [recipientName, iban]);

  assert.equal(masked.text.includes(recipientName), false);
  assert.equal(masked.text.includes(iban), false);
  assert.equal(masked.placeholders.length, 2);
  assert.equal(masked.restore(masked.text), original);
});

test('masks Angolan IBANs with and without the country prefix', () => {
  const prefixedIban = 'AO06 1234 5678 9012 3456 7890 1';
  const strippedIban = '1234 5678 9012 3456 7890 1';
  const original = `IBAN: ${prefixedIban}; referência: ${strippedIban}`;
  const masked = maskSensitiveText(original);

  assert.equal(masked.text.includes(prefixedIban), false);
  assert.equal(masked.text.includes(strippedIban), false);
  assert.equal(masked.restore(masked.text), original);
});
