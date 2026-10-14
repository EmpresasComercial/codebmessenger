CREATE OR REPLACE FUNCTION public.processar_renda_diaria_bots()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec RECORD;
    v_parcela NUMERIC;
    v_total_processados INTEGER := 0;
    v_total_valor NUMERIC := 0;
BEGIN
    UPDATE public.sys_600
    SET ativo = false,
        dias_restantes = 0
    WHERE ativo = true AND data_fim <= now();

    UPDATE public.sys_600
    SET dias_restantes = GREATEST(0, EXTRACT(DAY FROM (data_fim - now()))::integer)
    WHERE ativo = true;

    FOR v_rec IN
        SELECT
            s.id AS user_produto_id,
            s.user_id,
            s.renda_diaria,
            COALESCE(p.nome, 'Bot de Renda') AS produto_nome
        FROM public.sys_600 s
        LEFT JOIN public.produtos p ON s.produto_id = p.id
        WHERE s.ativo = true AND s.data_fim > now()
    LOOP
        v_parcela := ROUND((v_rec.renda_diaria / 4.0)::numeric, 2);

        IF v_parcela > 0 THEN
            UPDATE public.sys_t500
            SET saldo_disponivel = saldo_disponivel + v_parcela,
                updated_at = now()
            WHERE id = v_rec.user_id;

            INSERT INTO public.renda_diaria_mcpn (
                id,
                user_id,
                user_produto_id,
                valor,
                created_at
            ) VALUES (
                gen_random_uuid(),
                v_rec.user_id,
                v_rec.user_produto_id,
                v_parcela,
                now()
            );

            BEGIN
                INSERT INTO public.push_notifications_log (
                    user_id,
                    title,
                    body,
                    url,
                    status,
                    payload
                ) VALUES (
                    v_rec.user_id,
                    'Business Messenger 🤖💰',
                    'Rendimento creditado! +' || to_char(v_parcela, 'FM999,999,990.00') || ' Kz adicionados ao seu saldo disponível.',
                    '/perfil',
                    'pending',
                    jsonb_build_object('url', '/perfil', 'tipo', 'renda_bot')
                );
            EXCEPTION
                WHEN OTHERS THEN
                    NULL;
            END;

            v_total_processados := v_total_processados + 1;
            v_total_valor := v_total_valor + v_parcela;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'bots_processados', v_total_processados,
        'total_creditado', v_total_valor,
        'executado_em', now()
    );
END;
$$;

UPDATE public.push_notifications_log
SET title = 'Business Messenger 🤖💰'
WHERE title = 'Telegram Business 🤖💰';
