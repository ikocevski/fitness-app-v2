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

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // 2. Create user profile with subscription info
      // Only grant admin role if subscription is ACTIVE (paid), not trial
      const finalRole =
        role === "admin" && subscriptionStatus === "active"
          ? "admin"
          : "client";

      const userProfile = {
        id: authData.user.id,
        name,
        email,
        role: finalRole,
        subscription_tier: subscriptionTier || null,
        subscription_status: subscriptionStatus || null,
        subscription_expires_at:
          subscriptionStatus === "trial"
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
            : subscriptionStatus === "active"
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
              : null,
        created_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("users")
        .insert([userProfile]);

      // Handle duplicate key error (user already exists)
      if (profileError) {
        if (profileError.code === "23505") {
          // User already exists, update instead of insert
          const { error: updateError } = await supabase
            .from("users")
            .update({
              name,
              role: finalRole,
              subscription_tier: subscriptionTier || null,
              subscription_status: subscriptionStatus || null,
              subscription_expires_at: userProfile.subscription_expires_at,
            })
            .eq("id", authData.user.id);

          if (updateError) throw updateError;
        } else {
          throw profileError;
        }
      }

      // 3. If there's a subscription, save the receipt
      if (receiptData && subscriptionTier) {
        const subscriptionRecord = {
          user_id: authData.user.id,
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
              // The auth context will handle navigation based on role
              navigation.reset({
                index: 0,
                routes: [{ name: "Root" }],
              });
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
        return 49;
      case "pro":
        return 99;
      case "elite":
        return 199;
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
