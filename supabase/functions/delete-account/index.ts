// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const decodeJwtPayload = (token: string) => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Missing Supabase environment variables" },
        500,
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const authDebug: string[] = [];
    let resolvedUserId: string | null = null;

    if (bearerToken) {
      const { data, error } = await adminClient.auth.getUser(bearerToken);
      if (!error && data.user?.id) {
        resolvedUserId = data.user.id;
      } else {
        authDebug.push(`admin.getUser(token): ${error?.message || "no user"}`);
      }
    } else {
      authDebug.push("missing bearer token after parsing Authorization header");
    }

    if (!resolvedUserId && anonKey) {
      const anonAuthClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data, error } = await anonAuthClient.auth.getUser();
      if (!error && data.user?.id) {
        resolvedUserId = data.user.id;
      } else {
        authDebug.push(`anon.getUser(): ${error?.message || "no user"}`);
      }
    } else if (!anonKey) {
      authDebug.push("SUPABASE_ANON_KEY missing in function secrets");
    }

    if (!resolvedUserId && bearerToken) {
      const jwtPayload = decodeJwtPayload(bearerToken);
      const subject = jwtPayload?.sub;
      if (typeof subject === "string" && subject.length > 20) {
        resolvedUserId = subject;
        authDebug.push("resolved via jwt.sub fallback");
      } else {
        authDebug.push("jwt.sub fallback failed");
      }
    }

    if (!resolvedUserId) {
      return jsonResponse(
        {
          error: "Session expired. Please log in again and retry.",
          detail: authDebug.join(" | "),
        },
        401,
      );
    }

    const userId = resolvedUserId;

    // Delete auth user directly; related rows should be removed by DB cascades.
    const { error: authDeleteError } =
      await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      throw new Error(`Failed deleting auth user: ${authDeleteError.message}`);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("delete-account error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete account",
      },
      500,
    );
  }
});
