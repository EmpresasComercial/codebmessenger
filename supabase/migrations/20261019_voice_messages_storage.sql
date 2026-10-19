-- =====================================================================
-- MIGRATION: Sistema de mensagens de voz (Storage + RPC)
-- Date: 2026-10-19
-- Objetivo: Criar o bucket chat-voice-messages com políticas RLS seguras
--           e a função getvoice() (SECURITY DEFINER) que valida acesso
--           antes de o cliente gerar uma signed URL.
-- =====================================================================

-- -------------------------------------------------------------------
-- 1. BUCKET: chat-voice-messages
-- -------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-voice-messages',
  'chat-voice-messages',
  false,
  5242880,
  ARRAY[
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
    'audio/aac'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -------------------------------------------------------------------
-- 2. POLÍTICAS RLS no bucket
--    Paths:
--      private/<sender_id>/<recipient_id>/<uuid>.ext
--      group/<sender_id>/<uuid>.ext
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "voice_upload_own" ON storage.objects;
CREATE POLICY "voice_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-voice-messages'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 2) = auth.uid()::text
  );

DROP POLICY IF EXISTS "voice_read_own" ON storage.objects;
CREATE POLICY "voice_read_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-voice-messages'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 2) = auth.uid()::text
  );

DROP POLICY IF EXISTS "voice_delete_own" ON storage.objects;
CREATE POLICY "voice_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-voice-messages'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 2) = auth.uid()::text
  );

-- -------------------------------------------------------------------
-- 3. FUNÇÃO getvoice() — SECURITY DEFINER
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.getvoice(p_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid;
  v_parts        text[];
  v_path_type    text;
  v_sender_id    uuid;
  v_recipient_id uuid;
  v_is_member    boolean := false;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthenticated');
  END IF;

  v_parts     := string_to_array(p_path, '/');
  v_path_type := v_parts[1];

  IF v_path_type = 'private' AND array_length(v_parts, 1) >= 3 THEN
    v_sender_id    := v_parts[2]::uuid;
    v_recipient_id := v_parts[3]::uuid;

    IF v_uid = v_sender_id OR v_uid = v_recipient_id THEN
      SELECT EXISTS (
        SELECT 1 FROM sys_t110
        WHERE (remetente_id = v_sender_id AND destinatario_id = v_recipient_id)
           OR (remetente_id = v_recipient_id AND destinatario_id = v_sender_id)
        LIMIT 1
      ) INTO v_is_member;
    END IF;

  ELSIF v_path_type = 'group' AND array_length(v_parts, 1) >= 2 THEN
    v_sender_id := v_parts[2]::uuid;

    IF v_uid = v_sender_id THEN
      v_is_member := true;
    ELSE
      SELECT EXISTS (
        SELECT 1
        FROM equipe_mcpn e1
        JOIN equipe_mcpn e2 ON e1.grupo_id = e2.grupo_id
        WHERE e1.user_id = v_uid
          AND e2.user_id = v_sender_id
        LIMIT 1
      ) INTO v_is_member;
    END IF;
  END IF;

  IF v_is_member THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Access denied');
  END IF;

EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid path format');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.getvoice(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.getvoice(text) TO authenticated;

COMMENT ON FUNCTION public.getvoice(text) IS
  'SECURITY DEFINER: Validates that the authenticated user is a participant '
  'of the conversation that owns the voice audio at the given storage path. '
  'Must be called before generating a signed URL client-side.';
