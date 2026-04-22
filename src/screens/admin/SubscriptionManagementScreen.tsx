import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Linking,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
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

const TERMS_OF_USE_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const PRIVACY_POLICY_URL =
  "https://raw.githubusercontent.com/ikocevski/fitness-app-v2/main/privacy-policy.html";

const SubscriptionManagementScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const screenNavigation = useNavigation();

  // Permission check
  React.useEffect(() => {
    if (user && user.role !== "admin") {
      console.warn(
        "[SubscriptionManagementScreen] Unauthorized access attempt. User role:",
        user.role,
      );
      Alert.alert(
        "Unauthorized",
        "You don't have permission to access this page.",
        [
          {
            text: "Go Back",
            onPress: () => {
              screenNavigation.goBack();
            },
          },
        ],
      );
    }
  }, [user?.role, screenNavigation]);

  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        setSubscription(null);
        return;
      }

      // Get user's subscription info
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "subscription_tier, subscription_status, subscription_expires_at, client_limit",
        )
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      // Get client count
      const { count: clientCount, error: countError } = await supabase
        .from("coach_clients")
        .select("client_id", { count: "exact", head: true })
        .eq("coach_id", user.id);

      if (countError) {
        console.warn(
          "Error counting clients:",
          countError.message || countError,
        );
      }

      const normalizedStatus = (
        userData.subscription_status || ""
      ).toLowerCase();
      const trialDefaultClientLimit = 5;
      const derivedClientLimit =
        userData.client_limit && userData.client_limit > 0
          ? userData.client_limit
          : normalizedStatus === "trial"
            ? trialDefaultClientLimit
            : 0;

      setSubscription({
        tier: userData.subscription_tier,
        status: userData.subscription_status || "none",
        expiresAt: userData.subscription_expires_at,
        clientCount: clientCount || 0,
        clientLimit: derivedClientLimit,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      Alert.alert("Error", "Unable to load subscription data");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  useFocusEffect(
    useCallback(() => {
      fetchSubscriptionData();
    }, [fetchSubscriptionData]),
  );

  const handleUpgrade = () => {
    Alert.alert("Upgrade Subscription", "Choose your new plan", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Pro ($49/mo)",
        onPress: () => upgradeTo("pro"),
      },
      {
        text: "Elite ($59/mo)",
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

  const openLegalLink = async (url: string, label: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Link Unavailable", `Unable to open ${label} link.`);
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error(`Failed to open ${label} link:`, error);
      Alert.alert("Link Error", `Could not open ${label}. Please try again.`);
    }
  };

  const getTierInfo = (tier: SubscriptionTier) => {
    switch (tier) {
      case "starter":
        return {
          name: "Starter",
          price: "$39/mo",
          limit: 5,
          color: palette.primary,
        };
      case "pro":
        return {
          name: "Pro",
          price: "$49/mo",
          limit: 10,
          color: palette.success,
        };
      case "elite":
        return {
          name: "Elite",
          price: "$59/mo",
          limit: 15,
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
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (!subscription) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No subscription data available</Text>
      </SafeAreaView>
    );
  }

  const tierInfo = getTierInfo(subscription.tier);
  const effectiveClientLimit =
    subscription.clientLimit > 0
      ? subscription.clientLimit
      : typeof tierInfo.limit === "number"
        ? tierInfo.limit
        : 0;
  const planTitle =
    subscription.status === "trial" && !subscription.tier
      ? "Free Trial"
      : tierInfo.name === "No Plan"
        ? "No Plan"
        : `${tierInfo.name} Plan`;
  const planPrice =
    subscription.status === "trial" && !subscription.tier
      ? "$0 for 14 days"
      : tierInfo.price;
  const isNearLimit =
    effectiveClientLimit > 0 &&
    subscription.clientCount >= effectiveClientLimit * 0.8;
  const daysUntilExpiry = subscription.expiresAt
    ? Math.ceil(
        (new Date(subscription.expiresAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Subscription Management</Text>

        {/* Current Plan Card */}
        <View style={[styles.card, { borderColor: tierInfo.color }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.planName}>{planTitle}</Text>
              <Text style={styles.planPrice}>{planPrice}</Text>
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
            <Text
              style={[styles.usageText, isNearLimit && styles.usageWarning]}
            >
              {subscription.clientCount} /{" "}
              {effectiveClientLimit > 0 ? effectiveClientLimit : "∞"} clients
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width:
                      effectiveClientLimit > 0
                        ? `${Math.min((subscription.clientCount / effectiveClientLimit) * 100, 100)}%`
                        : "0%",
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
            <Text style={styles.feature}>✓ Unlimited workout plans</Text>
            <Text style={styles.feature}>✓ Unlimited meal plans</Text>
            <Text style={styles.feature}>✓ Video upload support</Text>
            <Text style={styles.feature}>✓ Basic analytics</Text>
            <Text style={styles.feature}>✓ Email support</Text>
            <Text style={styles.feature}>✓ {effectiveClientLimit} clients</Text>
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

        <Text style={styles.subscriptionDisclosure}>
          Auto-renewable subscription billed monthly. Cancel anytime from your
          App Store subscription settings.
        </Text>

        <View style={styles.legalLinksRow}>
          <TouchableOpacity
            onPress={() => openLegalLink(TERMS_OF_USE_URL, "Terms of Use")}
            style={styles.legalLinkButton}
          >
            <Text style={styles.legalLinkText}>Terms of Use</Text>
          </TouchableOpacity>

          <Text style={styles.legalDivider}>•</Text>

          <TouchableOpacity
            onPress={() => openLegalLink(PRIVACY_POLICY_URL, "Privacy Policy")}
            style={styles.legalLinkButton}
          >
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  subscriptionDisclosure: {
    ...typography.bodySmall,
    color: palette.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  legalLinksRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  legalLinkButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  legalLinkText: {
    ...typography.bodySmall,
    color: palette.primary,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  legalDivider: {
    ...typography.bodySmall,
    color: palette.textSecondary,
    marginHorizontal: spacing.xs,
  },
});

export default SubscriptionManagementScreen;
