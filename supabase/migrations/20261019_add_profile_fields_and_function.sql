-- Migration: Adicionar campos de perfil e RPC segura de atualização
-- Data: 2026-10-19

-- 1. Colunas avatar_url e bio na tabela sys_t500
ALTER TABLE public.sys_t500 
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text;

-- 2. Função segura e direta para atualização de perfil
CREATE OR REPLACE FUNCTION public.update_my_profile_mcpn(
  p_nome_exibicao text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_bio text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autenticado');
  END IF;

  UPDATE public.sys_t500
  SET 
    nome_exibicao = COALESCE(NULLIF(trim(p_nome_exibicao), ''), nome_exibicao),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    bio = COALESCE(p_bio, bio),
    updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'nome_exibicao', p_nome_exibicao,
    'avatar_url', p_avatar_url,
    'bio', p_bio
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile_mcpn(text, text, text) TO authenticated;

-- 3. Atualizar get_sender_phone_mcpn para expor avatar_url e bio em chats
CREATE OR REPLACE FUNCTION public.get_sender_phone_mcpn(p_uid uuid, p_detailed boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rec record;
BEGIN
  SELECT 
    a.id,
    a.telefone,
    COALESCE(a.nome_exibicao, a.telefone, 'Contato') AS nome_exibicao,
    a.avatar_url,
    a.bio,
    a.updated_at,
    e.created_at AS invited_at
  INTO v_rec
  FROM public.sys_t500 a
  LEFT JOIN public.equipe_mcpn e ON e.usuario_id = a.id
  WHERE a.id = p_uid
  LIMIT 1;

  IF v_rec.id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'id', v_rec.id,
    'nome_exibicao', v_rec.nome_exibicao,
    'telefone', v_rec.telefone,
    'avatar_url', v_rec.avatar_url,
    'bio', v_rec.bio,
    'invited_at', v_rec.invited_at,
    'registered_at', v_rec.invited_at
  );
END;
$function$;
