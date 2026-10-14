// Supabase Edge Function: send-push
// Envia notificação Web Push nativa diretamente para o dispositivo do usuário

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = "BB7OI7jz-WDgr7twGzs8Yl5q4YnY_efjp2jCAt47VFDxQ3xiJNFaItqKYcTkRKoBxWEiwVutuEumUaxzQSrA7C4";
const VAPID_PRIVATE_KEY = "D3spQ9rv9DYAUzg5k-hkK1WJaSUAQiWAhHybo8COczQ";
const VAPID_SUBJECT = "mailto:suporte@businessmessenger.com";

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  try {
    const { user_id, title, body, url } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios: user_id, title, body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Busca todas as inscrições dos dispositivos desse usuário
    const { data: subscriptions, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum dispositivo encontrado para este usuário." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title: title || "Business Messenger",
      body: body,
      icon: "/logo_bussiness_messeger.jpg",
      badge: "/logo_bussiness_messeger.jpg",
      url: url || "/perfil",
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        return { endpoint: sub.endpoint, status: "success" };
      } catch (err: any) {
        // Se a inscrição expirou no celular, remove do banco
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        }
        return { endpoint: sub.endpoint, status: "failed", error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
