CREATE OR REPLACE FUNCTION public.get_my_purchased_products_mcpn()
RETURNS TABLE (
    id uuid,
    preco_pago numeric,
    renda_diaria numeric,
    data_inicio timestamp with time zone,
    data_fim timestamp with time zone,
    dias_restantes integer,
    ativo boolean,
    produto_nome text,
    produto_imagem text,
    url_download_setup text,
    storage_size text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id, 
        up.preco_pago, 
        up.renda_diaria,
        up.data_inicio, 
        up.data_fim, 
        GREATEST(0, EXTRACT(DAY FROM (up.data_fim - now()))::integer) as dias_restantes,
        CASE WHEN up.data_fim <= now() THEN false ELSE up.ativo END as ativo,
        COALESCE(p.nome, 'Bot de Renda')::text as produto_nome,
        ''::text as produto_imagem,
        ''::text as url_download_setup,
        'Cloud'::text as storage_size
    FROM public.sys_600 up
    LEFT JOIN public.produtos p ON up.produto_id = p.id
    WHERE up.user_id = auth.uid()
    ORDER BY up.data_inicio DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_purchased_products_mcpn() TO authenticated, anon;
