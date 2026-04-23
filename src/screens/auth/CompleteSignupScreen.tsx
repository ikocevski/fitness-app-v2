import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { palette, spacing, typography } from "../../theme";
import { supabase } from "../../config/supabase";
import { SubscriptionTier } from "../../types";

const PRIVILEGED_ADMIN_EMAIL = "ivan@gmail.com";

interface CompleteSignupScreenProps {
  navigation: any;
  route: {
    params: {
      email: string;
      password: string;
      name: string;
      role: "client" | "admin";
      subscriptionTier?: SubscriptionTier;
      subscriptionStatus?: string;
      receiptData?: string;
    };
  };
}

const CompleteSignupScreen = ({
  navigation,
  route,
}: CompleteSignupScreenProps) => {
  const {
    email,
    password,
    name,
    role,
    subscriptionTier,
    subscriptionStatus,
    receiptData,
  } = route.params;
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    completeSignup();
  }, []);

  const completeSignup = async () => {
    setLoading(true);

    try {
      let authUserId: string | null = null;

      // 1. Create auth user with role metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role, // Store original role intent in auth metadata (we'll validate in profile)
          },
        },
      });

      if (authError) {
        const authMessage = (authError.message || "").toLowerCase();
        const isAlreadyRegistered =
          authMessage.includes("already registered") ||
          authMessage.includes("already been registered") ||
          authMessage.includes("user already exists");

        if (isAlreadyRegistered) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (signInError || !signInData.user) {
            throw new Error(
              "This email is already registered. Please log in instead, or use a different email.",
            );
          }

          authUserId = signInData.user.id;
        } else {
          throw authError;
        }
      }

      if (!authUserId && !authData.user) {
        throw new Error("Failed to create user");
      }

      authUserId = authUserId || authData.user.id;

      // 2. Create user profile with subscription info
      // Coaches on active subscription OR free trial should keep admin role
      const isPrivilegedAdmin =
        email.trim().toLowerCase() === PRIVILEGED_ADMIN_EMAIL;
      const isCoachEntitled =
        subscriptionStatus === "active" || subscriptionStatus === "trial";
      const finalRole =
        isPrivilegedAdmin || (role === "admin" && isCoachEntitled)
          ? "admin"
          : "client";

      const getClientLimitForTier = (tier: SubscriptionTier): number => {
        switch (tier) {
          case "starter":
            return 5;
          case "pro":
            return 10;
          case "elite":
            return 15;
          default:
            return 5; // Trial default
        }
      };

      const userProfile = {
        id: authUserId,
        name,
        email,
        role: finalRole,
        subscription_tier: isPrivilegedAdmin ? null : subscriptionTier || null,
        subscription_status: isPrivilegedAdmin
          ? "active"
          : subscriptionStatus || null,
        subscription_expires_at: isPrivilegedAdmin
          ? null
          : subscriptionStatus === "trial"
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
            : subscriptionStatus === "active"
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
              : null,
        client_limit:
          subscriptionStatus === "trial"
            ? 5
            : subscriptionTier
              ? getClientLimitForTier(subscriptionTier)
              : null,
        created_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("users")
        .upsert([userProfile], { onConflict: "id" });

      if (profileError) throw profileError;

      // 3. If there's a subscription, save the receipt
      if (receiptData && subscriptionTier) {
        const subscriptionRecord = {
          user_id: authUserId,
          tier: subscriptionTier,
          status: subscriptionStatus || "active",
          price: getSubscriptionPrice(subscriptionTier),
          receipt_data: receiptData,
          started_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        };

        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .insert([subscriptionRecord]);

        if (subscriptionError) {
          console.error("Subscription record error:", subscriptionError);
          // Don't fail the signup if subscription record fails
        }
      }

      // Success - navigate to appropriate screen
      Alert.alert(
        "Welcome!",
        role === "admin"
          ? `Your ${subscriptionStatus === "trial" ? "trial" : "subscription"} has been activated. Welcome to FitnessApp!`
          : "Welcome to FitnessApp! Your coach will be in touch soon.",
        [
          {
            text: "Get Started",
            onPress: () => {
              if (
                typeof navigation?.canGoBack === "function" &&
                navigation.canGoBack()
              ) {
                navigation.goBack();
              }
            },
          },
        ],
      );
    } catch (error: any) {
      console.error("Signup error:", error);
      Alert.alert(
        "Signup Failed",
        error.message || "Unable to complete signup. Please try again.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionPrice = (tier: SubscriptionTier): number => {
    switch (tier) {
      case "starter":
        return 39;
      case "pro":
        return 49;
      case "elite":
        return 59;
      default:
        return 0;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.text}>Creating your account...</Text>
        <Text style={styles.subtext}>This will only take a moment</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  text: {
    ...typography.heading2,
    color: palette.textPrimary,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  subtext: {
    ...typography.body,
    color: palette.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});

export default CompleteSignupScreen;
