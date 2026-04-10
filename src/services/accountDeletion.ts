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

  const { error } = await supabase.functions.invoke(DELETE_ACCOUNT_FUNCTION, {
    body: {
      userId: session.user.id,
    },
  });

  if (error) {
    throw error;
  }
};
