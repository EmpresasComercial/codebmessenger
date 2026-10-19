import assert from 'node:assert/strict';
import test from 'node:test';
import translations from './supplemental';

const attachmentFlowKeys = [
  'attachment.open',
  'attachment.close',
  'attachment.gallery',
  'attachment.camera',
  'attachment.document',
  'attachment.recent_empty',
  'attachment.recent_load_failed',
  'attachment.recent_save_failed',
  'group.photo_preview',
  'group.document_preview',
  'group.cancel_photo_preview',
  'group.cancel_document_preview',
  'group.replace_photo',
  'group.replace_document',
  'group.download_photo',
  'group.use_hd_quality',
  'group.use_standard_quality',
  'group.prepare_photo_failed',
  'group.prepare_document_failed',
  'group.add_caption',
  'group.send_photo',
  'group.send_document',
  'chat.pdf_too_large',
  'chat.pdf_invalid',
  'chat.pdf_validation_failed',
  'recharge.proof_invalid_type',
  'recharge.proof_not_available',
  'recharge.proof_prepare_failed',
] as const;

const voiceMessageKeys = [
  'chat.voice_record',
  'chat.voice_stop',
  'chat.voice_cancel',
  'chat.voice_send',
  'chat.voice_sending',
  'chat.voice_message',
  'chat.voice_unsupported',
  'chat.voice_permission_denied',
  'chat.voice_too_large',
  'chat.voice_unavailable',
  'chat.voice_send_failed',
  'chat.voice_storage_unavailable',
  'chat.voice_pause',
  'chat.voice_resume',
] as const;

const voiceMessageSizeLimits: Record<string, string> = {
  pt: '5 MB',
  en: '5 MB',
  fr: '5 Mo',
  ar: '5 ميغابايت',
  'zh-hans': '5 MB',
  es: '5 MB',
};

const aboutPageKeys = [
  'about.page_heading',
  'about.footer',
  'about.identity.title',
  'about.identity.body',
  'about.history.title',
  'about.history.body',
  'about.messaging.title',
  'about.messaging.body',
  'about.passkey.title',
  'about.passkey.body',
  'about.zoom.title',
  'about.zoom.body',
  'about.menu.title',
  'about.menu.body',
  'about.notifications.title',
  'about.notifications.body',
  'about.sessions.title',
  'about.sessions.body',
  'about.recharge.title',
  'about.recharge.body',
  'about.withdrawal.title',
  'about.withdrawal.body',
  'about.xfather.title',
  'about.xfather.body',
  'about.security.title',
  'about.security.body',
  'about.additional.title',
  'about.additional.body',
  'about.important.title',
  'about.important.body',
] as const;

const inviteIllustrationKeys = [
  'invite.demo_title',
  'invite.demo_copied',
  'invite.tree_description',
  'invite.tree_owner',
  'invite.tree_level_one',
  'invite.tree_level_two',
  'invite.tree_level_three',
  'invite.code_copy_instruction',
] as const;

const rechargeBankKeys = [
  'recharge.banks_query_failed',
] as const;

const walletBankCommandKeys = [
  'suggestion.add_bank',
  'suggestion.bank',
] as const;

const botFatherCommandKeys = [
  'suggestion.bots',
  'suggestion.password',
  'suggestion.active_bots',
  'suggestion.balance',
  'suggestion.income',
  'suggestion.limits',
  'suggestion.coupon',
  'suggestion.help',
] as const;

test('translates the attachment picker and preview flow in all supported languages', () => {
  for (const [language, dictionary] of Object.entries(translations)) {
    for (const key of attachmentFlowKeys) {
      assert.ok(
        Object.hasOwn(dictionary, key) && dictionary[key].trim().length > 0,
        `${language} is missing ${key}`
      );
    }
  }
});

test('translates voice messages and states the configured 5 MB limit', () => {
  for (const [language, dictionary] of Object.entries(translations)) {
    for (const key of voiceMessageKeys) {
      assert.ok(
        Object.hasOwn(dictionary, key) && dictionary[key].trim().length > 0,
        `${language} is missing ${key}`
      );
    }

    assert.ok(
      dictionary['chat.voice_too_large'].includes(voiceMessageSizeLimits[language]),
      `${language} does not state the configured 5 MB voice-message limit`
    );
  }
});

test('translates the About page in all supported languages', () => {
  for (const [language, dictionary] of Object.entries(translations)) {
    for (const key of aboutPageKeys) {
      assert.ok(
        Object.hasOwn(dictionary, key) && dictionary[key].trim().length > 0,
        `${language} is missing ${key}`
      );
    }
  }
});

test('translates invite illustrations in all supported languages', () => {
  for (const [language, dictionary] of Object.entries(translations)) {
    for (const key of inviteIllustrationKeys) {
      assert.ok(
        Object.hasOwn(dictionary, key) && dictionary[key].trim().length > 0,
        `${language} is missing ${key}`
      );
    }
  }
});

test('translates recharge bank-query errors in all supported languages', () => {
  for (const [language, dictionary] of Object.entries(translations)) {
    for (const key of rechargeBankKeys) {
      assert.ok(
        Object.hasOwn(dictionary, key) && dictionary[key].trim().length > 0,
        `${language} is missing ${key}`
      );
    }
  }
});

test('translates Wallet add-bank and view-bank command labels in all supported languages', () => {
  for (const [language, dictionary] of Object.entries(translations)) {
    for (const key of walletBankCommandKeys) {
      assert.ok(
        Object.hasOwn(dictionary, key) && dictionary[key].trim().length > 0,
        `${language} is missing ${key}`
      );
    }
  }
});

test('provides BotFather command labels in all supported languages', () => {
  for (const [language, dictionary] of Object.entries(translations)) {
    for (const key of botFatherCommandKeys) {
      assert.ok(
        Object.hasOwn(dictionary, key) && dictionary[key].trim().length > 0,
        `${language} is missing ${key}`
      );
    }
  }
});
