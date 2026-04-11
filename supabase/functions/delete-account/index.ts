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

    const authClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userData, error: userError } =
      await authClient.auth.getUser();
    if (userError || !userData.user) {
      const reason = userError?.message || "Unauthorized";
      if (reason.toLowerCase().includes("jwt")) {
        return jsonResponse(
          { error: "Session expired. Please log in again and retry." },
          401,
        );
      }
      return jsonResponse({ error: reason }, 401);
    }

    const userId = userData.user.id;

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
