import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../config/supabase";
import { User } from "../types";

const PRIVILEGED_ADMIN_EMAIL = "ivan@gmail.com";

const isPrivilegedAdminEmail = (email?: string | null): boolean =>
  (email || "").trim().toLowerCase() === PRIVILEGED_ADMIN_EMAIL;

const normalizeRole = (role?: string | null): "client" | "admin" | "new" => {
  const normalized = (role || "").toString().trim().toLowerCase();
  if (normalized === PRIVILEGED_ADMIN_EMAIL) return "admin";
  if (normalized === "admin") return "admin";
  if (normalized === "coach") return "admin";
  if (normalized === "new") return "new";
  return "client";
};

const hasCoachEntitlement = (userRow: any): boolean => {
  const status = (userRow?.subscription_status || "").toString().toLowerCase();
  const expiryRaw = userRow?.subscription_expires_at;
  const expiryDate = expiryRaw ? new Date(expiryRaw) : null;
  const hasFutureExpiry = expiryDate
    ? expiryDate.getTime() > Date.now()
    : false;

  if (status === "active" || status === "trial") return true;
  if (status === "canceled" && hasFutureExpiry) return true;
  return false;
};

// Extract role from Supabase user object, checking multiple sources
const extractAuthRole = (user: any): "client" | "admin" | "new" | null => {
  if (isPrivilegedAdminEmail(user?.email)) {
    return "admin";
  }

  console.log("[extractAuthRole] user_metadata:", user?.user_metadata);
  console.log("[extractAuthRole] app_metadata:", user?.app_metadata);
  console.log(
    "[extractAuthRole] raw_user_meta_data:",
    user?.raw_user_meta_data,
  );
  console.log("[extractAuthRole] raw_app_meta_data:", user?.raw_app_meta_data);

  const metaRole =
    user?.user_metadata?.role ||
    (Array.isArray(user?.user_metadata?.roles) &&
      user?.user_metadata?.roles[0]) ||
    user?.app_metadata?.role ||
    (Array.isArray(user?.app_metadata?.roles) &&
      user?.app_metadata?.roles[0]) ||
    user?.raw_user_meta_data?.role ||
    user?.raw_app_meta_data?.role ||
    user?.role ||
    user?.identities?.find((i: any) => i?.identity_data?.role)?.identity_data
      ?.role;

  console.log("[extractAuthRole] Extracted metaRole:", metaRole);

  if (!metaRole) return null;
  const normalized = normalizeRole(metaRole || null);
  console.log("[extractAuthRole] Normalized role:", normalized);
  return normalized;
};

export const login = async (
  email: string,
  password: string,
): Promise<User | null> => {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.error("Login error:", error);
      throw error;
    }

    if (data.user) {
      // Check public.users table first (source of truth)
      let { data: userRow, error: userError } = await supabase
        .from("users")
        .select(
          "id, email, name, role, subscription_status, subscription_expires_at",
        )
        .eq("id", data.user.id)
        .maybeSingle();

      if (userError) {
        console.error("User fetch error (login):", userError);
      }

      console.log("[login] User from public.users:", userRow);

      const emailValue = userRow?.email || data.user.email || cleanEmail;

      // If user doesn't exist in public.users, create with auth role
      if (!userRow) {
        const nameValue =
          (data.user.user_metadata?.name as string) ||
          (data.user.email ? data.user.email.split("@")[0] : "User");

        // Get role from auth metadata, default to "client"
        const authRole =
          isPrivilegedAdminEmail(cleanEmail) ||
          isPrivilegedAdminEmail(data.user.email)
            ? "admin"
            : extractAuthRole(data.user) || "client";

        const newProfile = {
          id: data.user.id,
          email: cleanEmail,
          name: nameValue,
          role: authRole,
          status: "pending",
          subscription_status: null,
          subscription_expires_at: null,
        };

        try {
          await supabase.from("users").insert([newProfile]);
          userRow = newProfile;
          console.log("[login] Created new profile:", newProfile);
        } catch (insertErr) {
          console.warn("[login] Profile insert failed:", insertErr);
        }
      }

      // Grab auth role as fallback
      const authRole = extractAuthRole(data.user);
      console.log("[login] Auth role from extractAuthRole:", authRole);

      // Resolve role: prefer public.users, then auth metadata
      const roleFromData = isPrivilegedAdminEmail(emailValue)
        ? "admin"
        : normalizeRole(userRow?.role ?? authRole ?? null);
      const resolvedRole = isPrivilegedAdminEmail(emailValue)
        ? "admin"
        : roleFromData === "client" && hasCoachEntitlement(userRow)
          ? "admin"
          : roleFromData;
      console.log("[login] Resolved role:", resolvedRole);

      // Use profile name first, fallback to email prefix - NEVER use auth metadata name
      const nameValue =
        userRow?.name ||
        (data.user.email ? data.user.email.split("@")[0] : "User");

      // Backfill missing profile name so future loads don't get null
      if (!userRow?.name) {
        try {
          await supabase
            .from("users")
            .update({ name: nameValue })
            .eq("id", data.user.id);
        } catch (updateErr) {
          console.warn("Profile name backfill failed (login):", updateErr);
        }
      }

      return {
        id: data.user.id,
        email: emailValue,
        name: nameValue,
        role: resolvedRole,
      };
    }

    return null;
  } catch (error) {
    console.error("Login failed:", error);
    return null;
  }
};

export const signUp = async (
  email: string,
  password: string,
  name: string,
  role: "client" | "admin" = "client",
): Promise<User | null> => {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();
    const safeName =
      (name || "").trim() || (cleanEmail ? cleanEmail.split("@")[0] : "User");
    console.log("[signUp] Starting signup with:", {
      email: cleanEmail,
      name: safeName,
      role,
    });

    // Sign up user with Auth
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          role: role, // Store role in auth metadata
        },
      },
    });

    if (error) {
      console.error("Sign up error:", error);
      const message = (error as any)?.message || String(error);
      const status = (error as any)?.status ?? (error as any)?.code;
      // Only treat as duplicate for specific signals
      const looksLikeExistingUser =
        /duplicate|already registered/i.test(message) ||
        status === 409 ||
        status === 422;
      if (looksLikeExistingUser) {
        // Don't automatically login - user should use login screen instead
        throw new Error(
          "This email is already registered. Please use the login screen or contact support if you need help.",
        );
      }
      // Surface original error for non-duplicate cases so UI can display it
      throw error;
    }

    if (data.user) {
      // New sign-ups always get role "new" - requires admin approval
      const profile: User = {
        id: data.user.id,
        email: cleanEmail,
        name: safeName,
        role: "new", // Force role "new" for all new signups - admin must approve
      };

      console.log(
        "[signUp] Attempting to save profile:",
        JSON.stringify(profile),
      );

      // Upsert into public.users to guarantee it saves
      const { data: savedData, error: upsertErr } = await supabase
        .from("users")
        .upsert([profile], { onConflict: "id" });

      if (upsertErr) {
        console.error("[signUp] Upsert failed:", upsertErr);
        throw upsertErr;
      }

      console.log(
        "[signUp] Profile saved successfully with role 'new' - awaiting admin approval:",
        savedData,
      );
      return profile;
    }

    return null;
  } catch (error) {
    console.error("Sign up failed:", error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }
    console.log("[getCurrentUser] User email:", session.user.email);
    console.log("[getCurrentUser] User ID:", session.user.id);

    // Check public.users table first (source of truth)
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select(
        "id, email, name, role, subscription_status, subscription_expires_at",
      )
      .eq("id", session.user.id)
      .maybeSingle();

    if (userError) {
      console.error("User fetch error (session):", userError);
    }

    console.log("[getCurrentUser] User from public.users:", userRow);

    const emailValue = userRow?.email || session.user.email || "";

    // Auth metadata role as fallback
    const authRole = extractAuthRole(session.user);
    console.log("[getCurrentUser] Auth role from extractAuthRole:", authRole);

    // Resolve role: prefer public.users, then auth metadata
    const roleFromData = isPrivilegedAdminEmail(emailValue)
      ? "admin"
      : normalizeRole(userRow?.role ?? authRole ?? null);
    const resolvedRole = isPrivilegedAdminEmail(emailValue)
      ? "admin"
      : roleFromData === "client" && hasCoachEntitlement(userRow)
        ? "admin"
        : roleFromData;
    console.log("[getCurrentUser] Resolved role:", resolvedRole);

    // Use profile name first, fallback to email prefix - NEVER use auth metadata name
    // This prevents old names from persisting if profile is deleted
    const nameValue =
      userRow?.name ||
      (session.user.email ? session.user.email.split("@")[0] : "User");

    return {
      id: session.user.id,
      email: emailValue,
      name: nameValue,
      role: resolvedRole,
    };
  } catch (error) {
    console.error("Get current user failed:", error);
    return null;
  }
};

export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "fitness-app://reset-password",
    });

    if (error) {
      console.error("Password reset error:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Password reset failed:", error);
    return false;
  }
};
