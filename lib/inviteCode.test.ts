import assert from 'node:assert/strict';
import test from 'node:test';
import { getInviteCode } from './inviteCode';

test('captures six-digit referral codes from signup links on both domains', () => {
  for (const url of [
    'https://telegramas.cc/signup?ref=123456',
    'https://www.telegramas.cc/signup?ref=123456',
  ]) {
    assert.equal(getInviteCode(new URL(url).searchParams), '123456');
  }
});

test('preserves leading zeroes in a referral code', () => {
  const params = new URLSearchParams('ref=000123');
  assert.equal(getInviteCode(params), '000123');
});

test('rejects codes that are not exactly six digits', () => {
  for (const value of ['12345', '1234567', '12A456']) {
    assert.equal(getInviteCode(new URLSearchParams(`ref=${value}`)), null);
  }
});

test('returns no code when there is no invite parameter', () => {
  assert.equal(getInviteCode(new URLSearchParams('campaign=123456')), null);
});
