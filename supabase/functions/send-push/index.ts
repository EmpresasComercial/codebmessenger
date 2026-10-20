// Supabase Edge Function: send-push
// Envia notificação Web Push nativa diretamente para o dispositivo do usuário

// @ts-nocheck
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
    const { user_id, title, body, url, senderName, senderPhone, message } = await req.json();

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

    // 1. Busca todas as inscrições dos dispositivos desse usuário em nucleo
    const { data: userProfile, error } = await supabaseAdmin
      .from("nucleo")
      .select("webpush_subscription")
      .eq("id", user_id)
      .maybeSingle();

    const rawSubs = userProfile?.webpush_subscription;
    const subscriptions = Array.isArray(rawSubs) ? rawSubs : (rawSubs ? [rawSubs] : []);

    if (error || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum dispositivo encontrado para este usuário." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title: title || "Busne Messaging",
      body: body,
      icon: "/logo_tegx.jfif",
      badge: "/notification-badge.svg",
      url: url || "/perfil",
      ...(typeof senderName === "string" ? { senderName } : {}),
      ...(typeof senderPhone === "string" ? { senderPhone } : {}),
      ...(typeof message === "string" ? { message } : {}),
    });

    const sendPromises = subscriptions.map(async (sub: any) => {
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
        // Se a inscrição expirou no celular, remove de nucleo
        if (err.statusCode === 410 || err.statusCode === 404) {
          const { data: currentProfile } = await supabaseAdmin
            .from("nucleo")
            .select("webpush_subscription")
            .eq("id", user_id)
            .maybeSingle();
          if (Array.isArray(currentProfile?.webpush_subscription)) {
            const updated = currentProfile.webpush_subscription.filter((s: any) => s.endpoint !== sub.endpoint);
            await supabaseAdmin.from("nucleo").update({ webpush_subscription: updated }).eq("id", user_id);
          }
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
