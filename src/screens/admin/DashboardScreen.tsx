import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../config/supabase";
import { palette, radii, spacing, shadows, typography } from "../../theme";

const AdminDashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalWorkouts: 0,
    totalDiets: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Count only this coach's linked clients
      const clientCountResp = await supabase
        .from("coach_clients")
        .select("client_id", { count: "exact", head: true })
        .eq("coach_id", user?.id);

      const totalClients = clientCountResp.count ?? 0;

      // Count workouts belonging to this coach (fallback to all if column/RLS issues)
      const workoutsScoped = await supabase
        .from("workouts")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", user?.id);
      const totalWorkouts =
        workoutsScoped.count ?? workoutsScoped.data?.length ?? 0;

      // Count diet plans belonging to this coach (fallback to all)
      const dietsScoped = await supabase
        .from("diet_plans")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", user?.id);
      const totalDiets = dietsScoped.count ?? dietsScoped.data?.length ?? 0;

      setStats({ totalClients, totalWorkouts, totalDiets });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#5B7FFF", "#4A68E6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Coach Dashboard</Text>
              <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>→</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statNumber}>{stats.totalClients}</Text>
            <Text style={styles.statLabel}>Clients</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💪</Text>
            <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🍎</Text>
            <Text style={styles.statNumber}>{stats.totalDiets}</Text>
            <Text style={styles.statLabel}>Diet Plans</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            onPress={() =>
              navigation.getParent()?.navigate("SubscriptionManagement")
            }
            activeOpacity={0.7}
          >
            <View style={[styles.actionCard, styles.subscriptionCard]}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>💳</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Subscription</Text>
                <Text style={styles.actionSubtitle}>
                  Manage your plan and billing
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Clients")}
            activeOpacity={0.7}
          >
            <View style={styles.actionCard}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>👥</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Manage Clients</Text>
                <Text style={styles.actionSubtitle}>
                  View and manage all clients
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Workouts")}
            activeOpacity={0.7}
          >
            <View style={styles.actionCard}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>💪</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Create Workouts</Text>
                <Text style={styles.actionSubtitle}>Add new workout plans</Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Diets")}
            activeOpacity={0.7}
          >
            <View style={styles.actionCard}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>🍎</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Diet Plans</Text>
                <Text style={styles.actionSubtitle}>
                  Create nutrition guides
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footerSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "500",
  },
  logoutButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...shadows.card,
  },
  statIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#5B7FFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickActions: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.button,
  },
  subscriptionCard: {
    borderColor: palette.primary,
    borderWidth: 2,
    backgroundColor: "#1a2332",
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#5B7FFF",
    marginBottom: 2,
    letterSpacing: -0.4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: palette.textSecondary,
    fontWeight: "500",
  },
  actionArrow: {
    fontSize: 24,
    color: "#5B7FFF",
  },
  footerSpacing: {
    height: spacing.xxl,
  },
});

export default AdminDashboardScreen;
