import { supabase } from './supabase';

export type VoiceMessageDestination =
  | { type: 'private'; recipientId: string }
  | { type: 'group' };

const VOICE_BUCKET = 'chat-voice-messages';

export const ensureVoiceStorageReady = async () => {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Voice storage could not be checked: ${error.message}`);
  }

  const hasBucket = data?.some((bucket) => bucket.name === VOICE_BUCKET);
  if (!hasBucket) {
    throw new Error('Voice storage bucket is not configured. Apply the Supabase migration for chat-voice-messages.');
  }
};

export const uploadVoiceMessage = async (
  blob: Blob,
  senderId: string,
  destination: VoiceMessageDestination
) => {
  await ensureVoiceStorageReady();

  const mimeType = blob.type || 'audio/webm';
  const extension = mimeType.includes('mp4')
    ? 'm4a'
    : mimeType.includes('ogg')
      ? 'ogg'
      : 'webm';
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const path = destination.type === 'private'
    ? `private/${senderId}/${destination.recipientId}/${fileName}`
    : `group/${senderId}/${fileName}`;

  const contentType = mimeType.split(';', 1)[0];
  const { error } = await supabase.storage
    .from(VOICE_BUCKET)
    .upload(path, blob, { contentType, upsert: false });

  if (error) throw error;
  return path;
};

export const deleteVoiceMessage = async (path: string) => {
  const { error } = await supabase.storage
    .from(VOICE_BUCKET)
    .remove([path]);
  if (error) throw error;
};
