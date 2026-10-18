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
