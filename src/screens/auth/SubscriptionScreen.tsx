import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { palette, spacing, typography, radii, shadows } from "../../theme";
import { SubscriptionPlan, SubscriptionTier } from "../../types";
import * as RNIap from "react-native-iap";

interface SubscriptionScreenProps {
  navigation: any;
  route: {
    params: {
      email: string;
      password: string;
      name: string;
    };
  };
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    clientLimit: 5,
    productId: "com.fitnessapp.coach.starter", // Replace with your actual App Store/Play Store product ID
    features: [
      "Up to 5 active clients",
      "Unlimited workout plans",
      "Unlimited meal plans",
      "Video upload support",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    clientLimit: 15,
    productId: "com.fitnessapp.coach.pro",
    features: [
      "Up to 15 active clients",
      "Unlimited workout plans",
      "Unlimited meal plans",
      "Video upload support",
      "Advanced analytics",
      "Priority email support",
      "Custom branding",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    price: 199,
    clientLimit: 999999,
    productId: "com.fitnessapp.coach.elite",
    features: [
      "Unlimited clients",
      "Unlimited workout plans",
      "Unlimited meal plans",
      "Video upload support",
      "Advanced analytics",
      "24/7 priority support",
      "Custom branding",
      "White-label option",
      "API access",
    ],
  },
];

const SubscriptionScreen = ({ navigation, route }: SubscriptionScreenProps) => {
  const { email, password, name } = route.params;
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>("pro");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    initIAP();
    return () => {
      RNIap.endConnection();
    };
  }, []);

  const initIAP = async () => {
    try {
      await RNIap.initConnection();
      const productIds = SUBSCRIPTION_PLANS.map((plan) => plan.productId);
      try {
        const availableProducts = await RNIap.fetchProducts({
          skus: productIds,
          type: "subs",
        });
        setProducts(availableProducts);
      } catch (fetchErr: any) {
        // E_IAP_NOT_AVAILABLE in development/simulator
        if (fetchErr.code === "E_IAP_NOT_AVAILABLE") {
          console.warn(
            "IAP not available (simulator/development). Using dev mode."
          );
        } else {
          console.warn("Error fetching IAP products:", fetchErr);
        }
      }
    } catch (err) {
      console.warn("IAP initialization error:", err);
      // Continue without IAP for development/testing
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      Alert.alert("Error", "Please select a subscription plan");
      return;
    }

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan);
    if (!plan) return;

    setLoading(true);

    try {
      // In development, skip actual IAP and go straight to signup
      // In production, this will trigger the App Store/Play Store purchase flow
      if (__DEV__) {
        Alert.alert(
          "Development Mode",
          "IAP disabled in development. Proceeding with free trial.",
          [
            {
              text: "Continue",
              onPress: () => {
                navigation.navigate("CompleteSignup", {
                  email,
                  password,
                  name,
                  role: "admin",
                  subscriptionTier: selectedPlan,
                  subscriptionStatus: "trial",
                });
              },
            },
          ],
        );
        setLoading(false);
        return;
      }

      // Production IAP flow
      await RNIap.requestSubscription({ sku: plan.productId });

      // Purchase will be handled by purchaseUpdatedListener
      Alert.alert("Success", "Subscription started!", [
        {
          text: "Continue",
          onPress: () => {
            navigation.navigate("CompleteSignup", {
              email,
              password,
              name,
              role: "admin",
              subscriptionTier: selectedPlan,
              subscriptionStatus: "active",
            });
          },
        },
      ]);
    } catch (err: any) {
      console.error("Purchase error:", err);
      if (err.code !== "E_USER_CANCELLED") {
        Alert.alert(
          "Purchase Failed",
          "Unable to complete purchase. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkipForNow = () => {
    Alert.alert(
      "Start Free Trial?",
      "You can start with a 14-day free trial and subscribe later.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Start Trial",
          onPress: () => {
            navigation.navigate("CompleteSignup", {
              email,
              password,
              name,
              role: "admin",
              subscriptionTier: null,
              subscriptionStatus: "trial",
            });
          },
        },
      ],
    );
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isSelected = selectedPlan === plan.id;
    const isRecommended = plan.id === "pro";

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
          isRecommended && styles.planCardRecommended,
        ]}
        onPress={() => setSelectedPlan(plan.id)}
        activeOpacity={0.8}
      >
        {isRecommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>MOST POPULAR</Text>
          </View>
        )}

        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.currency}>$</Text>
          <Text style={styles.price}>{plan.price}</Text>
          <Text style={styles.period}>/month</Text>
        </View>

        <Text style={styles.clientLimit}>
          {plan.clientLimit > 100 ? "Unlimited" : `Up to ${plan.clientLimit}`}{" "}
          Clients
        </Text>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedText}>✓ Selected</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Select the plan that best fits your coaching business
        </Text>

        <View style={styles.plansContainer}>
          {SUBSCRIPTION_PLANS.map((plan) => renderPlanCard(plan))}
        </View>

        <TouchableOpacity
          style={[
            styles.subscribeButton,
            loading && styles.subscribeButtonDisabled,
          ]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              Subscribe to{" "}
              {SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)?.name}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkipForNow} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>
            Start 14-Day Free Trial Instead
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Subscriptions auto-renew monthly. Cancel anytime from your account
          settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    ...typography.heading1,
    color: palette.textPrimary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  plansContainer: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: palette.border,
    ...shadows.card,
    position: "relative",
  },
  planCardSelected: {
    borderColor: palette.primary,
    borderWidth: 3,
  },
  planCardRecommended: {
    borderColor: palette.success,
  },
  recommendedBadge: {
    position: "absolute",
    top: -12,
    right: spacing.lg,
    backgroundColor: palette.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  recommendedText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  planName: {
    ...typography.heading2,
    color: palette.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  currency: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.textPrimary,
    marginTop: 8,
  },
  price: {
    fontSize: 48,
    fontWeight: "800",
    color: palette.textPrimary,
    lineHeight: 56,
  },
  period: {
    fontSize: 16,
    color: palette.textSecondary,
    marginTop: 32,
  },
  clientLimit: {
    ...typography.body,
    color: palette.primary,
    textAlign: "center",
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  featuresContainer: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkmark: {
    color: palette.success,
    fontSize: 18,
    fontWeight: "700",
  },
  featureText: {
    ...typography.body,
    color: palette.textSecondary,
    flex: 1,
  },
  selectedIndicator: {
    marginTop: spacing.md,
    backgroundColor: palette.primary,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: "center",
  },
  selectedText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  subscribeButton: {
    backgroundColor: palette.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    ...shadows.button,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  skipButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  skipButtonText: {
    color: palette.textSecondary,
    fontWeight: "600",
  },
  backButton: {
    marginTop: spacing.md,
    alignSelf: "center",
  },
  backButtonText: {
    ...typography.body,
    color: palette.primary,
    fontWeight: "600",
  },
  disclaimer: {
    ...typography.bodySmall,
    color: palette.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});

export default SubscriptionScreen;
