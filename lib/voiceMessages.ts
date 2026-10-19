import { supabase } from './supabase';

export type VoiceMessageDestination =
  | { type: 'private'; recipientId: string }
  | { type: 'group' };

const VOICE_BUCKET = 'chat-voice-messages';

export const uploadVoiceMessage = async (
  blob: Blob,
  senderId: string,
  destination: VoiceMessageDestination
) => {
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
