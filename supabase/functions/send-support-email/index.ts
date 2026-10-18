// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPPORT_EMAIL = "contacta@telegramas.cc";

function jsonResponse(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("SUPPORT_FROM_EMAIL");
    if (!resendApiKey || !senderEmail) {
      console.error("Support email delivery is missing its Resend configuration.");
      return jsonResponse({ error: "Email service is not configured." }, 500);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON." }, 400);
    }

    const email = payload?.email;
    const message = payload?.message;
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof message !== "string" ||
      message.trim().length === 0 ||
      message.length > 5000
    ) {
      return jsonResponse({ error: "Enter a valid email and a message under 5000 characters." }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      console.error("SUPPORT_FROM_EMAIL must be a valid verified sender address.");
      return jsonResponse({ error: "Email service is not configured." }, 500);
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Teggram-X Support <${senderEmail}>`,
        to: [SUPPORT_EMAIL],
        reply_to: email.trim(),
        subject: "Help Center support request",
        text: `Reply to: ${email.trim()}\n\n${message.trim()}`,
      }),
    });

    if (!resendResponse.ok) {
      const providerError = await resendResponse.text();
      console.error("Resend rejected a support message:", resendResponse.status, providerError);
      return jsonResponse({ error: "Could not deliver the support email." }, 502);
    }

    return jsonResponse({ message: "Support email sent." });
  } catch (error) {
    console.error("Failed to send support email:", error);
    return jsonResponse({ error: "Could not send the support email." }, 500);
  }
});
