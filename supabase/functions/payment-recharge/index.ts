import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Obter autorização do usuário logado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado: token ausente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente com o token do usuário para autenticação estrita
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida ou expirada." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente com privilégios de serviço seguro para operações de banco
    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey,
      {
        auth: { persistSession: false },
      }
    );

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // 1. Obter dados iniciais (saldo, recargas, bancos)
    if (action === "get_initial_data") {
      const [withdrawRes, accRes, banksRes] = await Promise.all([
        adminClient.rpc("get_withdraw_info_mcpn"),
        adminClient.rpc("get_my_account_data"),
        adminClient.rpc("get_collection_banks_mcpn"),
      ]);

      let userBalance = 0;
      if (withdrawRes.data && withdrawRes.data.length > 0) {
        userBalance = Number(withdrawRes.data[0].balance) || 0;
      }

      let totalRecharges = 0;
      if (accRes.data && accRes.data.length > 0) {
        totalRecharges = Number((accRes.data[0] as any).total_recarregado ?? 0);
      } else {
        const { data: recData } = await adminClient
          .from("recargas_mcpn")
          .select("valor, status")
          .eq("user_id", user.id);
        if (recData) {
          totalRecharges = recData
            .filter((r: any) => r.status === "aprovado" || r.status === "concluido")
            .reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0);
        }
      }

      let banks: any[] = [];
      if (!banksRes.error && Array.isArray(banksRes.data)) {
        banks = banksRes.data;
      }

      return new Response(
        JSON.stringify({
          userBalance,
          totalRecharges,
          banks,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Criar pedido de recarga
    if (action === "create_recharge") {
      const { amount, bank_id, bank_name } = body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount < 3000 || numAmount > 500000) {
        return new Response(
          JSON.stringify({ error: "Valor fora dos limites permitidos (3.000 a 500.000 KZ)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let rechargeId: string | null = null;

      // Executa RPC com token do usuário
      const { data: rpcData, error: rpcError } = await userClient.rpc("request_recharge_kz_mcpn", {
        p_amount: numAmount,
        p_bank_id: bank_id,
      });

      if (!rpcError && rpcData) {
        rechargeId = rpcData?.recharge_id || rpcData?.id || (typeof rpcData === "string" ? rpcData : null);
      }

      if (!rechargeId) {
        // Fallback seguro via adminClient atribuído ao user.id verificado
        const { data: inserted, error: insertError } = await adminClient
          .from("recargas_mcpn")
          .insert({
            user_id: user.id,
            valor: numAmount,
            status: "pendente",
            detalhes_transacao: {
              banco: bank_name || "Depósito Bancário",
              metodo: "chat_bot",
            },
          })
          .select("id")
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }
        rechargeId = inserted?.id;
      }

      return new Response(
        JSON.stringify({ success: true, rechargeId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2b. Cancelar um pedido ainda pendente do usuário autenticado
    if (action === "cancel_recharge") {
      const rechargeId = typeof body.recharge_id === "string" ? body.recharge_id.trim() : "";
      if (!rechargeId) {
        return new Response(
          JSON.stringify({ error: "ID do pedido de recarga ausente." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: cancelledRecharge, error: cancelError } = await adminClient
        .from("recargas_mcpn")
        .update({ status: "cancelado" })
        .eq("id", rechargeId)
        .eq("user_id", user.id)
        .in("status", ["pendente", "pending"])
        .select("id")
        .maybeSingle();

      if (cancelError) {
        throw new Error(cancelError.message);
      }
      if (!cancelledRecharge) {
        return new Response(
          JSON.stringify({ error: "O pedido não existe ou já não está pendente." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, rechargeId: cancelledRecharge.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Confirmar recarga com comprovativo
    if (action === "confirm_recharge") {
      const { recharge_id, bank_name, image_path } = body;

      if (!recharge_id || !image_path) {
        return new Response(
          JSON.stringify({ error: "ID da recarga ou imagem ausente." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: confirmData, error: confirmError } = await userClient.rpc("confirm_recharge_mcpn", {
        p_recharge_id: recharge_id,
        p_bank_name: bank_name || "Depósito Bancário",
        p_image_path: image_path,
      });

      if (confirmError) {
        // Fallback update
        await adminClient
          .from("recargas_mcpn")
          .update({
            comprovativo_url: image_path,
            banco_origem: bank_name,
            status: "pendente",
          })
          .eq("id", recharge_id)
          .eq("user_id", user.id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Comprovativo recebido e registrado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Histórico de recargas
    if (action === "get_history") {
      const { data, error } = await userClient.rpc("get_my_recharges_mcpn");
      if (!error && Array.isArray(data) && data.length > 0) {
        return new Response(
          JSON.stringify({ list: data.slice(0, 10) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: tableData } = await adminClient
        .from("recargas_mcpn")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({ list: tableData || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação não suportada" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
