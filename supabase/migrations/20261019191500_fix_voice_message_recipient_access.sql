-- Allow authenticated chat participants to read voice messages that were
-- actually attached to a private or community chat message.

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

  v_parts := string_to_array(p_path, '/');
  v_path_type := v_parts[1];

  IF v_path_type = 'private' AND array_length(v_parts, 1) = 4 THEN
    v_sender_id := v_parts[2]::uuid;
    v_recipient_id := v_parts[3]::uuid;

    IF v_uid = v_sender_id OR v_uid = v_recipient_id THEN
      SELECT EXISTS (
        SELECT 1
        FROM sys_t110
        WHERE (
          (remetente_id = v_sender_id AND destinatario_id = v_recipient_id)
          OR (remetente_id = v_recipient_id AND destinatario_id = v_sender_id)
        )
          AND detalhes ->> 'audio_path' = p_path
      ) INTO v_is_member;
    END IF;

  ELSIF v_path_type = 'group' AND array_length(v_parts, 1) = 3 THEN
    v_sender_id := v_parts[2]::uuid;

    SELECT EXISTS (
      SELECT 1
      FROM chat_gruop
      WHERE uid_emissor = v_sender_id
        AND detalhes ->> 'audio_path' = p_path
    ) INTO v_is_member;
  END IF;

  IF v_is_member THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  RETURN jsonb_build_object('success', false, 'message', 'Access denied');
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid path format');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.getvoice(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.getvoice(text) TO authenticated;

DROP POLICY IF EXISTS "voice_read_own" ON storage.objects;
DROP POLICY IF EXISTS "voice_read_conversation" ON storage.objects;
CREATE POLICY "voice_read_conversation"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-voice-messages'
    AND auth.uid() IS NOT NULL
    AND COALESCE(public.getvoice(name) ->> 'success', 'false') = 'true'
  );
