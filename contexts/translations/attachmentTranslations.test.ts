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
