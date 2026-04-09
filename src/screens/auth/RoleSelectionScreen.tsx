import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { palette, spacing, typography, radii, shadows } from "../../theme";

interface RoleSelectionScreenProps {
  navigation: any;
  route: {
    params: {
      email: string;
      password: string;
      name: string;
    };
  };
}

const RoleSelectionScreen = ({
  navigation,
  route,
}: RoleSelectionScreenProps) => {
  const { email, password, name } = route.params;

  const handleRoleSelect = (role: "client" | "coach") => {
    if (role === "coach") {
      // Navigate to subscription screen
      navigation.navigate("Subscription", { email, password, name });
    } else {
      // Client signup is free, complete registration
      navigation.navigate("CompleteSignup", {
        email,
        password,
        name,
        role: "client",
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Choose Your Role</Text>
        <Text style={styles.subtitle}>Select how you'll be using the app</Text>

        <View style={styles.cardsContainer}>
          {/* Client Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleRoleSelect("client")}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>👤</Text>
            </View>
            <Text style={styles.cardTitle}>I'm a Client</Text>
            <Text style={styles.cardDescription}>
              Work with a coach to track your fitness journey
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>FREE</Text>
            </View>
            <View style={styles.featuresList}>
              <Text style={styles.feature}>✓ Access workout plans</Text>
              <Text style={styles.feature}>✓ View meal plans</Text>
              <Text style={styles.feature}>✓ Track progress</Text>
              <Text style={styles.feature}>✓ Message your coach</Text>
            </View>
          </TouchableOpacity>

          {/* Coach Card */}
          <TouchableOpacity
            style={[styles.card, styles.coachCard]}
            onPress={() => handleRoleSelect("coach")}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🏋️</Text>
            </View>
            <Text style={styles.cardTitle}>I'm a Coach</Text>
            <Text style={styles.cardDescription}>
              Manage clients and create personalized programs
            </Text>
            <View style={[styles.badge, styles.premiumBadge]}>
              <Text style={styles.badgeText}>STARTING AT $49/mo</Text>
            </View>
            <View style={styles.featuresList}>
              <Text style={styles.feature}>✓ Create workout plans</Text>
              <Text style={styles.feature}>✓ Design meal plans</Text>
              <Text style={styles.feature}>✓ Manage multiple clients</Text>
              <Text style={styles.feature}>✓ Upload workout videos</Text>
              <Text style={styles.feature}>✓ Track client analytics</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
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
    paddingBottom: spacing.xl,
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
  cardsContainer: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: palette.border,
    ...shadows.card,
  },
  coachCard: {
    borderColor: palette.primary,
    borderWidth: 2,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 48,
  },
  cardTitle: {
    ...typography.heading2,
    color: palette.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  badge: {
    backgroundColor: palette.success,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  premiumBadge: {
    backgroundColor: palette.primary,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  featuresList: {
    gap: spacing.xs,
  },
  feature: {
    ...typography.body,
    color: palette.textSecondary,
    fontSize: 14,
  },
  backButton: {
    marginTop: spacing.xl,
    alignSelf: "center",
  },
  backButtonText: {
    ...typography.body,
    color: palette.primary,
    fontWeight: "600",
  },
});

export default RoleSelectionScreen;
