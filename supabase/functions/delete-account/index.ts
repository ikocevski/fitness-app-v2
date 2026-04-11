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

const getIds = (rows: Array<{ id: string }> | null | undefined) =>
  (rows || []).map((row) => row.id);

const isSkippableSchemaError = (message: string) => {
  const value = message.toLowerCase();
  return (
    value.includes("does not exist") ||
    value.includes("column") ||
    value.includes("relation") ||
    value.includes("schema cache") ||
    value.includes("could not find") ||
    value.includes("pgrst")
  );
};

const runCleanup = async (label: string, fn: () => Promise<void>) => {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isSkippableSchemaError(message)) {
      console.warn(`[delete-account] Skipping ${label}: ${message}`);
      return;
    }
    throw error;
  }
};

const deleteIn = async (
  client: ReturnType<typeof createClient>,
  table: string,
  column: string,
  ids: string[],
) => {
  if (ids.length === 0) return;
  const { error } = await client.from(table).delete().in(column, ids);
  if (error) {
    throw new Error(`Failed deleting from ${table}: ${error.message}`);
  }
};

const deleteWhere = async (
  client: ReturnType<typeof createClient>,
  table: string,
  query: string,
) => {
  const { error } = await client.from(table).delete().or(query);
  if (error) {
    throw new Error(`Failed deleting from ${table}: ${error.message}`);
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Missing Supabase environment variables" },
        500,
      );
    }

    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!bearerToken) {
      return jsonResponse({ error: "Missing bearer token" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userData, error: userError } =
      await adminClient.auth.getUser(bearerToken);
    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userId = userData.user.id;

    // 1) Remove direct links and user-owned rows (best effort).
    await runCleanup("session_notifications", () =>
      deleteWhere(adminClient, "session_notifications", `user_id.eq.${userId}`),
    );
    await runCleanup("coach_sessions", () =>
      deleteWhere(
        adminClient,
        "coach_sessions",
        `coach_id.eq.${userId},client_id.eq.${userId},created_by.eq.${userId}`,
      ),
    );
    await runCleanup("coach_clients", () =>
      deleteWhere(
        adminClient,
        "coach_clients",
        `coach_id.eq.${userId},client_id.eq.${userId}`,
      ),
    );
    await runCleanup("weight_logs", () =>
      deleteWhere(adminClient, "weight_logs", `user_id.eq.${userId}`),
    );
    await runCleanup("subscriptions", () =>
      deleteWhere(adminClient, "subscriptions", `user_id.eq.${userId}`),
    );
    await runCleanup("users_role", () =>
      deleteWhere(adminClient, "users_role", `user_id.eq.${userId}`),
    );
    await runCleanup("legacy_workouts", () =>
      deleteWhere(
        adminClient,
        "workouts",
        `coach_id.eq.${userId},assigned_to_client_id.eq.${userId}`,
      ),
    );

    // 2) Workout plans and nested records (best effort).
    await runCleanup("workout_plans_nested", async () => {
      const { data: workoutPlans, error: workoutPlanError } = await adminClient
        .from("workout_plans")
        .select("id")
        .or(`coach_id.eq.${userId},client_id.eq.${userId}`);

      if (workoutPlanError) {
        throw new Error(
          `Failed loading workout plans: ${workoutPlanError.message}`,
        );
      }

      const workoutPlanIds = getIds(workoutPlans);
      if (workoutPlanIds.length > 0) {
        const { data: workoutDays, error: workoutDayError } = await adminClient
          .from("workout_days")
          .select("id")
          .in("plan_id", workoutPlanIds);

        if (workoutDayError) {
          throw new Error(
            `Failed loading workout days: ${workoutDayError.message}`,
          );
        }

        const workoutDayIds = getIds(workoutDays);
        await deleteIn(
          adminClient,
          "workout_exercises",
          "day_id",
          workoutDayIds,
        );
        await deleteIn(adminClient, "workout_days", "plan_id", workoutPlanIds);
      }

      await deleteWhere(
        adminClient,
        "workout_plans",
        `coach_id.eq.${userId},client_id.eq.${userId}`,
      );
    });

    // 3) Diet plans and nested records (best effort).
    await runCleanup("diet_plans_nested", async () => {
      const { data: dietPlans, error: dietPlanError } = await adminClient
        .from("diet_plans")
        .select("id")
        .or(
          `created_by.eq.${userId},user_id.eq.${userId},assigned_to_client_id.eq.${userId},coach_id.eq.${userId}`,
        );

      if (dietPlanError) {
        throw new Error(`Failed loading diet plans: ${dietPlanError.message}`);
      }

      const dietPlanIds = getIds(dietPlans);
      if (dietPlanIds.length > 0) {
        await deleteIn(
          adminClient,
          "diet_plan_meals",
          "diet_plan_id",
          dietPlanIds,
        );
      }

      await deleteWhere(
        adminClient,
        "diet_meals",
        `coach_id.eq.${userId},user_id.eq.${userId},created_by.eq.${userId},assigned_to_client_id.eq.${userId}`,
      );
      await deleteWhere(
        adminClient,
        "diet_plans",
        `created_by.eq.${userId},user_id.eq.${userId},assigned_to_client_id.eq.${userId},coach_id.eq.${userId}`,
      );
    });

    // 4) Remove profile row (best effort), then auth user (required).
    await runCleanup("users_profile", () =>
      deleteWhere(adminClient, "users", `id.eq.${userId}`),
    );

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
