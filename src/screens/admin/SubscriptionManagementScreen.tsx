import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { palette, spacing, typography, radii, shadows } from "../../theme";
import { supabase } from "../../config/supabase";
import { useAuth } from "../../context/AuthContext";
import { SubscriptionTier } from "../../types";
import * as RNIap from "react-native-iap";

interface SubscriptionData {
  tier: SubscriptionTier;
  status: string;
  expiresAt: string;
  clientCount: number;
  clientLimit: number;
}

const SubscriptionManagementScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);

      // Get user's subscription info
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "subscription_tier, subscription_status, subscription_expires_at, client_limit",
        )
        .eq("id", user?.id)
        .single();

      if (userError) throw userError;

      // Get client count
      const { count: clientCount, error: countError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "client")
        .or(`coach_id.eq.${user?.id}`); // Adjust based on your schema

      if (countError) console.warn("Error counting clients:", countError);

      setSubscription({
        tier: userData.subscription_tier,
        status: userData.subscription_status || "none",
        expiresAt: userData.subscription_expires_at,
        clientCount: clientCount || 0,
        clientLimit: userData.client_limit || 0,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      Alert.alert("Error", "Unable to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    Alert.alert("Upgrade Subscription", "Choose your new plan", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Pro ($99/mo)",
        onPress: () => upgradeTo("pro"),
      },
      {
        text: "Elite ($199/mo)",
        onPress: () => upgradeTo("elite"),
      },
    ]);
  };

  const upgradeTo = async (tier: SubscriptionTier) => {
    try {
      setLoading(true);

      if (__DEV__) {
        // Development mode - simulate upgrade
        const { error } = await supabase
          .from("users")
          .update({
            subscription_tier: tier,
            subscription_status: "active",
            subscription_expires_at: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          })
          .eq("id", user?.id);

        if (error) throw error;

        Alert.alert("Success", "Subscription upgraded successfully!");
        fetchSubscriptionData();
      } else {
        // Production - use IAP
        const productId = `com.fitnessapp.coach.${tier}`;
        await RNIap.requestSubscription({ sku: productId });

        // Purchase result will come through purchaseUpdatedListener
        // For now, show success and update
        Alert.alert("Processing", "Your upgrade is being processed.", [
          {
            text: "OK",
            onPress: () => {
              // In production, wait for purchaseUpdatedListener
              // For now, update subscription
              supabase
                .from("users")
                .update({
                  subscription_tier: tier,
                  subscription_status: "active",
                  subscription_expires_at: new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
                })
                .eq("id", user?.id)
                .then(() => {
                  Alert.alert("Success", "Subscription upgraded!");
                  fetchSubscriptionData();
                });
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error("Upgrade error:", error);
      if (error.code !== "E_USER_CANCELLED") {
        Alert.alert("Error", "Unable to upgrade subscription");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel? You'll lose access at the end of your billing period.",
      [
        {
          text: "Keep Subscription",
          style: "cancel",
        },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("users")
                .update({ subscription_status: "canceled" })
                .eq("id", user?.id);

              if (error) throw error;

              Alert.alert(
                "Subscription Canceled",
                "Your subscription will remain active until the end of the billing period.",
              );
              fetchSubscriptionData();
            } catch (error) {
              Alert.alert("Error", "Unable to cancel subscription");
            }
          },
        },
      ],
    );
  };

  const getTierInfo = (tier: SubscriptionTier) => {
    switch (tier) {
      case "starter":
        return {
          name: "Starter",
          price: "$49/mo",
          limit: 5,
          color: palette.primary,
        };
      case "pro":
        return {
          name: "Pro",
          price: "$99/mo",
          limit: 15,
          color: palette.success,
        };
      case "elite":
        return {
          name: "Elite",
          price: "$199/mo",
          limit: "Unlimited",
          color: "#FFD700",
        };
      default:
        return {
          name: "No Plan",
          price: "$0/mo",
          limit: 0,
          color: palette.textSecondary,
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return palette.success;
      case "trial":
        return palette.primary;
      case "canceled":
      case "expired":
        return palette.danger;
      default:
        return palette.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (!subscription) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No subscription data available</Text>
      </View>
    );
  }

  const tierInfo = getTierInfo(subscription.tier);
  const isNearLimit =
    subscription.clientCount >= subscription.clientLimit * 0.8;
  const daysUntilExpiry = subscription.expiresAt
    ? Math.ceil(
        (new Date(subscription.expiresAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Subscription Management</Text>

      {/* Current Plan Card */}
      <View style={[styles.card, { borderColor: tierInfo.color }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.planName}>{tierInfo.name} Plan</Text>
            <Text style={styles.planPrice}>{tierInfo.price}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(subscription.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {subscription.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client Usage */}
        <View style={styles.usageSection}>
          <Text style={styles.usageTitle}>Client Usage</Text>
          <Text style={[styles.usageText, isNearLimit && styles.usageWarning]}>
            {subscription.clientCount} /{" "}
            {typeof tierInfo.limit === "number" ? tierInfo.limit : "∞"} clients
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min((subscription.clientCount / subscription.clientLimit) * 100, 100)}%`,
                  backgroundColor: isNearLimit
                    ? palette.danger
                    : palette.success,
                },
              ]}
            />
          </View>
          {isNearLimit && (
            <Text style={styles.warningText}>
              ⚠️ You're approaching your client limit. Consider upgrading.
            </Text>
          )}
        </View>

        {/* Expiry Date */}
        {daysUntilExpiry !== null && (
          <View style={styles.expirySection}>
            <Text style={styles.expiryLabel}>
              {subscription.status === "trial" ? "Trial ends" : "Renews"} in:
            </Text>
            <Text style={styles.expiryValue}>{daysUntilExpiry} days</Text>
          </View>
        )}
      </View>

      {/* Features */}
      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Your Plan Includes:</Text>
        <View style={styles.featuresList}>
          <Text style={styles.feature}>✓ {tierInfo.limit} clients</Text>
          <Text style={styles.feature}>✓ Unlimited workout plans</Text>
          <Text style={styles.feature}>✓ Unlimited meal plans</Text>
          <Text style={styles.feature}>✓ Video upload support</Text>
          {subscription.tier === "pro" || subscription.tier === "elite" ? (
            <Text style={styles.feature}>✓ Advanced analytics</Text>
          ) : null}
          {subscription.tier === "elite" ? (
            <>
              <Text style={styles.feature}>✓ Custom branding</Text>
              <Text style={styles.feature}>✓ API access</Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        {subscription.tier !== "elite" &&
          subscription.status !== "canceled" && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgrade}
            >
              <Text style={styles.upgradeButtonText}>⬆️ Upgrade Plan</Text>
            </TouchableOpacity>
          )}

        {subscription.status === "active" && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSubscription}
          >
            <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
          </TouchableOpacity>
        )}

        {subscription.status === "trial" && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
          >
            <Text style={styles.upgradeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  title: {
    ...typography.heading1,
    color: palette.textPrimary,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 3,
    ...shadows.elevated,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  planName: {
    ...typography.heading2,
    color: palette.textPrimary,
  },
  planPrice: {
    ...typography.body,
    color: palette.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: spacing.md,
  },
  usageSection: {
    marginBottom: spacing.md,
  },
  usageTitle: {
    ...typography.body,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
  },
  usageText: {
    ...typography.heading3,
    color: palette.textPrimary,
    marginBottom: spacing.sm,
  },
  usageWarning: {
    color: palette.danger,
  },
  progressBar: {
    height: 8,
    backgroundColor: palette.border,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  warningText: {
    ...typography.bodySmall,
    color: palette.danger,
    marginTop: spacing.sm,
  },
  expirySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expiryLabel: {
    ...typography.body,
    color: palette.textSecondary,
  },
  expiryValue: {
    ...typography.body,
    color: palette.textPrimary,
    fontWeight: "700",
  },
  featuresCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  featuresTitle: {
    ...typography.heading3,
    color: palette.textPrimary,
    marginBottom: spacing.md,
  },
  featuresList: {
    gap: spacing.sm,
  },
  feature: {
    ...typography.body,
    color: palette.textSecondary,
  },
  buttonsContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  upgradeButton: {
    backgroundColor: palette.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    ...shadows.button,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.danger,
  },
  cancelButtonText: {
    color: palette.danger,
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    alignSelf: "center",
    marginTop: spacing.md,
  },
  backButtonText: {
    ...typography.body,
    color: palette.primary,
    fontWeight: "600",
  },
});

export default SubscriptionManagementScreen;
