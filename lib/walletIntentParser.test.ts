import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNaturalLanguage } from './walletIntentParser';

test('parses the balance and history commands', () => {
  assert.deepEqual(parseNaturalLanguage('/saldo'), { intent: 'balance' });
  assert.deepEqual(parseNaturalLanguage('mostra o histórico dos meus saques'), { intent: 'history' });
});

test('prioritizes adding and deleting bank accounts', () => {
  assert.deepEqual(parseNaturalLanguage('/adicionar_banco'), { intent: 'add_bank' });
  assert.deepEqual(parseNaturalLanguage('remover a minha conta bancária'), { intent: 'delete_bank' });
  assert.deepEqual(parseNaturalLanguage('/iban'), { intent: 'bank' });
});

test('parses withdrawal intents and localized amounts', () => {
  assert.deepEqual(parseNaturalLanguage('quero sacar 1.500 kz'), { intent: 'withdraw', amount: 1500 });
  assert.deepEqual(parseNaturalLanguage('retirar tudo'), { intent: 'withdraw', isAll: true });
  assert.deepEqual(parseNaturalLanguage('como posso sacar'), { intent: 'withdraw_info' });
});

test('recognizes support, confirmations, cancellations, and greetings', () => {
  assert.deepEqual(parseNaturalLanguage('o meu saque ainda não caiu'), { intent: 'support' });
  assert.deepEqual(parseNaturalLanguage('confirmar'), { intent: 'confirm' });
  assert.deepEqual(parseNaturalLanguage('não'), { intent: 'cancel' });
  assert.deepEqual(parseNaturalLanguage('bom dia'), { intent: 'greeting' });
});

test('returns unknown for unrelated text', () => {
  assert.deepEqual(parseNaturalLanguage('mensagem sem comando reconhecido'), { intent: 'unknown' });
});
