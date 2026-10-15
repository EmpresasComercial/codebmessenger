-- ==============================================================================
-- MIGRATION: 20261015_restrict_getpay_getwallet_authenticated.sql
-- Restrição de acesso exclusivo para usuários autenticados (authenticated)
-- nas funções SECURITY DEFINER public.getpay() e public.getwallet()
-- ==============================================================================

-- 1. Atualizar getpay() com verificação obrigatória de autenticação
CREATE OR REPLACE FUNCTION public.getpay()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_mcpn, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_balance NUMERIC := 0;
    v_total_recarregado NUMERIC := 0;
    v_has_pending BOOLEAN := false;
    v_banks JSONB := '[]'::jsonb;
    v_payload JSONB;
    v_encrypted_token TEXT;
BEGIN
    -- Validação estrita de autenticação
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acesso não autorizado: autenticação obrigatória.';
    END IF;

    -- Obter saldo e total recarregado do usuário autenticado
    SELECT COALESCE(saldo_disponivel, 0), COALESCE(total_recarregado, 0)
    INTO v_user_balance, v_total_recarregado
    FROM public.sys_t500
    WHERE id = v_user_id;

    -- Verificar se o usuário possui recarga pendente
    SELECT EXISTS(
        SELECT 1 FROM public.paymentbot 
        WHERE user_id = v_user_id AND status IN ('pendente', 'pending')
    ) INTO v_has_pending;

    -- Bancos de arrecadação da tabela pasta
    SELECT contas INTO v_banks FROM public.pasta LIMIT 1;
    IF v_banks IS NULL THEN
        v_banks := '[]'::jsonb;
    END IF;

    -- Montagem do payload oficial
    v_payload := jsonb_build_object(
        'bot_type', 'payment_assistant',
        'currency', 'KZ',
        'min_amount', 3000,
        'max_amount', 500000,
        'fee_percent', 0,
        'processing_time', '2 a 15 minutos',
        'schedule', 'Disponível 24/7 para envio de comprovativos e recargas',
        'banks', v_banks,
        'user', jsonb_build_object(
            'authenticated', true,
            'balance', v_user_balance,
            'total_recharged', v_total_recarregado,
            'has_pending', v_has_pending
        ),
        'timestamp', EXTRACT(EPOCH FROM now())
    );

    BEGIN
        v_encrypted_token := private_mcpn.encrypt_data_mcpn(v_payload::text);
    EXCEPTION WHEN OTHERS THEN
        v_encrypted_token := encode(v_payload::text::bytea, 'base64');
    END;

    RETURN jsonb_build_object(
        'success', true,
        'min_amount', 3000,
        'max_amount', 500000,
        'fee_percent', 0,
        'currency', 'KZ',
        'processing_time', '2 a 15 minutos',
        'schedule', 'Disponível 24/7 para envio de comprovativos e recargas',
        'banks', v_banks,
        'user_balance', v_user_balance,
        'has_pending', v_has_pending,
        'encrypted_token', v_encrypted_token
    );
END;
$$;

-- Revogar acesso público e anônimo, conceder APENAS a authenticated e service_role
REVOKE ALL ON FUNCTION public.getpay() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.getpay() TO authenticated, service_role;


-- 2. Atualizar getwallet() com verificação obrigatória de autenticação
CREATE OR REPLACE FUNCTION public.getwallet()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_mcpn, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_balance NUMERIC := 0;
    v_total_retirado NUMERIC := 0;
    v_has_pending BOOLEAN := false;
    v_has_bank BOOLEAN := false;
    v_bank_name TEXT := NULL;
    v_iban TEXT := NULL;
    v_has_bots BOOLEAN := false;
    v_now_luanda TIMESTAMP := (now() AT TIME ZONE 'Africa/Luanda');
    v_day_of_week INT := EXTRACT(DOW FROM v_now_luanda);
    v_hour INT := EXTRACT(HOUR FROM v_now_luanda);
    v_is_banking_hours BOOLEAN := false;
    v_payload JSONB;
    v_encrypted_token TEXT;
BEGIN
    -- Validação estrita de autenticação
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acesso não autorizado: autenticação obrigatória.';
    END IF;

    -- Horário bancário: Segunda a Sexta (1 a 5) das 09:00 às 18:00
    IF v_day_of_week BETWEEN 1 AND 5 AND v_hour >= 9 AND v_hour < 18 THEN
        v_is_banking_hours := true;
    END IF;

    -- Saldo e total retirado de sys_t500
    SELECT COALESCE(saldo_disponivel, 0), COALESCE(total_retirado, 0)
    INTO v_user_balance, v_total_retirado
    FROM public.sys_t500
    WHERE id = v_user_id;

    -- Retirada pendente
    SELECT EXISTS(
        SELECT 1 FROM public.retiradas_mcpn
        WHERE user_id = v_user_id AND status = 'pendente'
    ) INTO v_has_pending;

    -- Conta bancária vinculada em sys_t111
    SELECT 
        true,
        (dados_bancarios->>'nome_banco')::text,
        COALESCE(private_mcpn.decrypt_data_mcpn(dados_bancarios->>'iban'), 'IBAN Registrado')
    INTO v_has_bank, v_bank_name, v_iban
    FROM public.sys_t111
    WHERE user_id = v_user_id
    LIMIT 1;

    -- Bots ativos
    SELECT EXISTS(
        SELECT 1 FROM public.sys_600
        WHERE user_id = v_user_id AND ativo = true AND (data_fim IS NULL OR data_fim > now())
    ) INTO v_has_bots;

    -- Montagem do payload oficial com taxa 14% (fator líquido 0.86)
    v_payload := jsonb_build_object(
        'bot_type', 'wallet_assistant',
        'currency', 'KZ',
        'min_amount', 3000,
        'max_amount', 500000,
        'fee_percent', 14,
        'net_factor', 0.86,
        'formula', 'valor_liquido = valor_bruto * 0.86',
        'schedule', 'Segunda a Sexta-feira, das 09:00 às 18:00 (dias úteis)',
        'is_banking_hours_now', v_is_banking_hours,
        'processing_time', 'De instantes a poucas horas em horário bancário (máx. 24h úteis)',
        'user', jsonb_build_object(
            'authenticated', true,
            'balance', v_user_balance,
            'total_withdrawn', v_total_retirado,
            'has_pending', v_has_pending,
            'has_bank', COALESCE(v_has_bank, false),
            'bank_name', v_bank_name,
            'has_bots', v_has_bots
        ),
        'timestamp', EXTRACT(EPOCH FROM now())
    );

    BEGIN
        v_encrypted_token := private_mcpn.encrypt_data_mcpn(v_payload::text);
    EXCEPTION WHEN OTHERS THEN
        v_encrypted_token := encode(v_payload::text::bytea, 'base64');
    END;

    RETURN jsonb_build_object(
        'success', true,
        'min_amount', 3000,
        'max_amount', 500000,
        'fee_percent', 14,
        'net_factor', 0.86,
        'formula', 'valor_liquido = valor_bruto * 0.86',
        'schedule', 'Segunda a Sexta-feira, das 09:00 às 18:00 (dias úteis)',
        'is_banking_hours_now', v_is_banking_hours,
        'processing_time', 'De instantes a poucas horas em horário bancário (máx. 24h úteis)',
        'user_balance', v_user_balance,
        'has_pending', v_has_pending,
        'has_bank', COALESCE(v_has_bank, false),
        'bank_name', v_bank_name,
        'has_bots', v_has_bots,
        'encrypted_token', v_encrypted_token
    );
END;
$$;

-- Revogar acesso público e anônimo, conceder APENAS a authenticated e service_role
REVOKE ALL ON FUNCTION public.getwallet() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.getwallet() TO authenticated, service_role;
