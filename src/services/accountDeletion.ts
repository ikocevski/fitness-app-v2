import { supabase } from "../config/supabase";

const DELETE_ACCOUNT_FUNCTION = "delete-account";

export const deleteCurrentAccount = async (): Promise<void> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.user) {
    throw new Error("No active session found.");
  }

  const { data, error } = await supabase.functions.invoke(
    DELETE_ACCOUNT_FUNCTION,
    {
      body: {
        userId: session.user.id,
      },
    },
  );

  if (error) {
    const maybeContext = (error as any)?.context;
    if (maybeContext && typeof maybeContext.json === "function") {
      try {
        const payload = await maybeContext.json();
        if (payload?.error) {
          throw new Error(payload.error);
        }
      } catch {
        // Ignore JSON parsing failures and fallback to generic message.
      }
    }
    throw new Error((error as any)?.message || "Failed to delete account.");
  }

  if (data && typeof data === "object" && "error" in (data as any)) {
    throw new Error((data as any).error || "Failed to delete account.");
  }
};
