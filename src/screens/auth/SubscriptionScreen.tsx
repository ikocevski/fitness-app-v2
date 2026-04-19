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
  Platform,
  Linking,
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
    price: 39.99,
    clientLimit: 5,
    productId: "com.fitnessapp.coach.starter", // Replace with your actual App Store/Play Store product ID
    features: [
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
    price: 49.99,
    clientLimit: 10,
    productId: "com.fitnessapp.coach.pro",
    features: [
      "Unlimited workout plans",
      "Unlimited meal plans",
      "Video upload support",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    price: 59.99,
    clientLimit: 15,
    productId: "com.fitnessapp.coach.elite",
    features: [
      "Unlimited workout plans",
      "Unlimited meal plans",
      "Video upload support",
      "Basic analytics",
      "Email support",
    ],
  },
];

const TERMS_OF_USE_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const PRIVACY_POLICY_URL =
  "https://github.com/ikocevski/fitness-app-v2/blob/main/privacy-policy.html";

const SubscriptionScreen = ({ navigation, route }: SubscriptionScreenProps) => {
  const { email, password, name } = route.params;
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>("pro");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [iapAvailable, setIapAvailable] = useState(true);

  const getClientRangeLabel = (tier: SubscriptionTier) => {
    switch (tier) {
      case "starter":
        return "1-5 Clients";
      case "pro":
        return "5-10 Clients";
      case "elite":
        return "10-15 Clients";
      default:
        return "Clients";
    }
  };

  const getPlanPriceLabel = (plan: SubscriptionPlan) => {
    const storeProduct = products.find(
      (product) => product.productId === plan.productId,
    );

    if (storeProduct?.localizedPrice) {
      return `${storeProduct.localizedPrice}/month`;
    }

    return `$${plan.price.toFixed(2)}/month`;
  };

  useEffect(() => {
    initIAP();
    return () => {
      try {
        RNIap.endConnection().catch((cleanupError: any) => {
          if (cleanupError?.code !== "E_IAP_NOT_AVAILABLE") {
            console.warn("IAP cleanup error:", cleanupError);
          }
        });
      } catch (cleanupError: any) {
        if (cleanupError?.code !== "E_IAP_NOT_AVAILABLE") {
          console.warn("IAP cleanup exception:", cleanupError);
        }
      }
    };
  }, []);

  const initIAP = async () => {
    if (__DEV__ || Platform.OS === "web") {
      setIapAvailable(false);
      return;
    }

    try {
      await RNIap.initConnection();
      setIapAvailable(true);
      const productIds = SUBSCRIPTION_PLANS.map((plan) => plan.productId);
      try {
        const availableProducts = await RNIap.getSubscriptions({
          skus: productIds,
        });
        setProducts(availableProducts);
      } catch (fetchErr: any) {
        // E_IAP_NOT_AVAILABLE in development/simulator
        if (fetchErr.code === "E_IAP_NOT_AVAILABLE") {
          setIapAvailable(false);
          console.warn(
            "IAP not available (simulator/development). Using dev mode.",
          );
        } else {
          console.warn("Error fetching IAP products:", fetchErr);
        }
      }
    } catch (err) {
      setIapAvailable(false);
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

    const startFreeTrial = () => {
      navigation.navigate("CompleteSignup", {
        email,
        password,
        name,
        role: "admin",
        subscriptionTier: null,
        subscriptionStatus: "trial",
      });
    };

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
      if (!iapAvailable) {
        Alert.alert(
          "In-App Purchase Unavailable",
          "Subscriptions are currently unavailable on this device. You can start a free trial now and subscribe later.",
          [
            {
              text: "Start Free Trial",
              onPress: startFreeTrial,
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ],
        );
        return;
      }

      const selectedProduct = products.find(
        (product) => product.productId === plan.productId,
      );

      if (!selectedProduct) {
        Alert.alert(
          "Subscription Not Available",
          "This subscription product is not currently available in App Store Connect. You can start a free trial now and subscribe later.",
          [
            {
              text: "Start Free Trial",
              onPress: startFreeTrial,
            },
            {
              text: "Try Again",
              onPress: initIAP,
            },
          ],
        );
        return;
      }

      await RNIap.requestSubscription({ sku: selectedProduct.productId });

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
          "Unable to complete purchase right now. You can start a free trial and subscribe later.",
          [
            {
              text: "Start Free Trial",
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
            {
              text: "Try Again",
              style: "cancel",
            },
          ],
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
          <Text style={styles.localizedPrice}>{getPlanPriceLabel(plan)}</Text>
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.clientLimit}>{getClientRangeLabel(plan.id)}</Text>

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
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  localizedPrice: {
    fontSize: 42,
    fontWeight: "800",
    color: palette.textPrimary,
    lineHeight: 50,
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
  legalLinksRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
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

export default SubscriptionScreen;
