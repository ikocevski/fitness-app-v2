import { supabase } from "../config/supabase";
import Constants from "expo-constants";

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

  const supabaseUrl =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration in app constants.");
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/${DELETE_ACCOUNT_FUNCTION}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: session.user.id }),
    },
  );

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload?.error ||
      payload?.message ||
      text ||
      `Delete function failed with status ${response.status}`;
    throw new Error(detail);
  }

  if (payload && typeof payload === "object" && payload.error) {
    throw new Error(payload.error);
  }
};
