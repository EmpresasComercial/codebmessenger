import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWithdrawalFeeExample } from './withdrawalFeeExample';

test('explains a withdrawal fee using the deducted fee and resulting net amount', () => {
  const example = buildWithdrawalFeeExample(12, (amount) => `${amount.toLocaleString('pt-AO')} KZ`);

  assert.equal(example.grossAmount, 10000);
  assert.equal(example.feeAmount, 1200);
  assert.equal(example.netAmount, 8800);
  assert.match(example.text, /10.?000/);
  assert.match(example.text, /1.?200/);
  assert.match(example.text, /8.?800/);
  assert.doesNotMatch(example.text, /0\.88|0\.86|valor_bruto|valor_liquido/i);
});
