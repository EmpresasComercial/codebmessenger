import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
} from "https://esm.sh/libphonenumber-js@1.11.20/max";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Tratar requisições OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    // Usamos a anon key para respeitar os limites de segurança normais de login/signup
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { action, phone, password, options, country_code, country_name } = await req.json();

    if (!phone || !password) {
      return new Response(
        JSON.stringify({ error: "Missing phone or password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawPhoneDigits = String(phone).replace(/\D/g, "");
    let cleanPhone = rawPhoneDigits;
    let legacyEmail: string | null = null;

    // Normalize numbers to one country-prefixed identity for both signup and login.
    if (country_code) {
      try {
        const callingCode = getCountryCallingCode(country_code);
        const alreadyHasCallingCode =
          rawPhoneDigits.startsWith(callingCode) &&
          rawPhoneDigits.length > callingCode.length + 5;
        const fullE164 = phone.startsWith("+")
          ? phone
          : `+${alreadyHasCallingCode ? rawPhoneDigits : `${callingCode}${rawPhoneDigits}`}`;
        
        const parsed = parsePhoneNumberFromString(fullE164, country_code);
        if (!parsed || !parsed.isValid() || parsed.countryCallingCode !== callingCode) {
          return new Response(
            JSON.stringify({
              error: `Introduza um número de telefone válido de ${country_name || country_code}.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        cleanPhone = `${parsed.countryCallingCode}${parsed.nationalNumber}`;
        if (action === "login" && rawPhoneDigits !== cleanPhone) {
          legacyEmail = `${rawPhoneDigits}@user.com`;
        }
      } catch (_err) {
        // Fallback gracioso se o código do país não for suportado
      }
    }

    // A "gambiarra" invisível no backend: transformamos o phone em email falso
    const fakeEmail = `${cleanPhone}@user.com`;

    let result;

    if (action === "signup") {
      const finalOptions = {
        ...options,
        data: {
          ...(options?.data || {}),
          country_code: country_code || options?.data?.country_code,
          country_name: country_name || options?.data?.country_name,
        },
      };

      result = await supabase.auth.signUp({
        email: fakeEmail,
        password,
        options: finalOptions,
      });
    } else if (action === "login") {
      result = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password,
      });

      if (result.error && legacyEmail) {
        const legacyResult = await supabase.auth.signInWithPassword({
          email: legacyEmail,
          password,
        });
        if (!legacyResult.error) result = legacyResult;
      }

      // Se autenticado com sucesso e temos country_code, verificar se o país confere com o cadastrado
      if (result.data?.user && country_code) {
        const metaCountry = result.data.user.user_metadata?.country_code;
        if (metaCountry && metaCountry !== country_code) {
          return new Response(
            JSON.stringify({
              error: "COUNTRY_MISMATCH",
              message: `Este número de telefone pertence a outro país. Introduza um número de telefone válido de ${country_name || country_code}.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(result.data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
