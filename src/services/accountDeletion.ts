import { supabase } from "../config/supabase";
import Constants from "expo-constants";

const DELETE_ACCOUNT_FUNCTION = "delete-account";
const REQUEST_TIMEOUT_MS = 15000;

const withTimeout = async <T>(promise: Promise<T>, message: string) => {
  return (await Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(message)), REQUEST_TIMEOUT_MS);
    }),
  ])) as T;
};

export const deleteCurrentAccount = async (): Promise<void> => {
  const {
    data: { session },
    error: sessionError,
  } = await withTimeout(
    supabase.auth.getSession(),
    "Session check timed out. Please try again.",
  );

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.user) {
    throw new Error("No active session found.");
  }

  let activeSession = session;
  try {
    const { data: refreshedData } = await withTimeout(
      supabase.auth.refreshSession(),
      "Session refresh timed out.",
    );

    if (refreshedData?.session?.access_token) {
      activeSession = refreshedData.session;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const isTimeoutOrNetwork =
      message.includes("timed out") ||
      message.includes("network") ||
      message.includes("fetch");

    if (!isTimeoutOrNetwork) {
      console.warn("Session refresh skipped:", error);
    }
  }

  if (!activeSession?.access_token) {
    throw new Error("Session expired. Please log in again and retry.");
  }

  const supabaseUrl =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration in app constants.");
  }

  const abortController = new AbortController();
  const abortTimeout = setTimeout(
    () => abortController.abort(),
    REQUEST_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/${DELETE_ACCOUNT_FUNCTION}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activeSession.access_token}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: activeSession.user.id }),
      signal: abortController.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Delete request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(abortTimeout);
  }

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

    if (
      typeof detail === "string" &&
      detail.toLowerCase().includes("invalid jwt")
    ) {
      throw new Error("Session expired. Please log in again and retry.");
    }

    throw new Error(detail);
  }

  if (payload && typeof payload === "object" && payload.error) {
    throw new Error(payload.error);
  }
};
