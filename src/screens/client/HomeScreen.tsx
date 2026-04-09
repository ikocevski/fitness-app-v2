import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import WeightModal from "../../components/common/WeightModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../config/supabase";
import { palette, radii, spacing, shadows, typography } from "../../theme";

const HomeScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({
    workouts: 0,
    calories: 0,
    minutes: 0,
  });

  useEffect(() => {
    if (user?.id) {
      checkDailyWeightLog();
      loadTodayStats();
      calculateStreak();
    }
  }, [user?.id]);

  const calculateStreak = async () => {
    try {
      const { data, error } = await supabase
        .from("weight_logs")
        .select("logged_at")
        .eq("user_id", user?.id)
        .order("logged_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setStreak(0);
        return;
      }

      // Calculate consecutive days
      let currentStreak = 0;
      let previousDate: Date | null = null;

      for (const log of data) {
        const logDate = new Date(log.logged_at);
        logDate.setHours(0, 0, 0, 0);

        if (previousDate === null) {
          // First iteration - check if it's today or yesterday
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          if (
            logDate.getTime() === today.getTime() ||
            logDate.getTime() === yesterday.getTime()
          ) {
            currentStreak = 1;
            previousDate = logDate;
          } else {
            // Not a current streak
            break;
          }
        } else {
          // Check if this log is exactly one day before the previous
          const expectedDate = new Date(previousDate);
          expectedDate.setDate(expectedDate.getDate() - 1);

          if (logDate.getTime() === expectedDate.getTime()) {
            currentStreak++;
            previousDate = logDate;
          } else {
            // Streak broken
            break;
          }
        }
      }

      setStreak(currentStreak);
    } catch (error) {
      console.error("Error calculating streak:", error);
    }
  };

  const loadTodayStats = async () => {
    try {
      setStats({ workouts: 0, calories: 0, minutes: 0 });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const checkDailyWeightLog = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user?.id)
        .gte("logged_at", todayISO)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        await AsyncStorage.setItem(
          "lastWeightLogDate",
          new Date().toDateString(),
        );
        setShowWeightModal(false);
      } else {
        setShowWeightModal(true);
      }
    } catch (error) {
      console.error("Error checking weight log:", error);
      const lastLogDate = await AsyncStorage.getItem("lastWeightLogDate");
      if (lastLogDate !== new Date().toDateString()) {
        setShowWeightModal(true);
      }
    }
  };

  const handleWeightSaved = async () => {
    try {
      await AsyncStorage.setItem(
        "lastWeightLogDate",
        new Date().toDateString(),
      );
    } catch (error) {
      console.error("Error saving weight log date:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <WeightModal
        visible={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        userId={user?.id || ""}
        onWeightSaved={handleWeightSaved}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium Header */}
          <LinearGradient
            colors={["#5B7FFF", "#4A68E6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumHeader}
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.userName}>{user?.name}</Text>
              </View>
            </View>
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatLabel}>Streak</Text>
                <Text style={styles.headerStatValue}>{streak} days</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.statCard1]}>
              <Text style={styles.statIcon}>🏋️</Text>
              <Text style={styles.statValue}>{stats.workouts}</Text>
              <Text style={styles.statLabel}>WORKOUTS</Text>
            </View>
            <View style={[styles.statCard, styles.statCard2]}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={styles.statValue}>{stats.calories}</Text>
              <Text style={styles.statLabel}>CALORIES</Text>
            </View>
            <View style={[styles.statCard, styles.statCard3]}>
              <Text style={styles.statIcon}>⏱️</Text>
              <Text style={styles.statValue}>{stats.minutes}</Text>
              <Text style={styles.statLabel}>MINUTES</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate("Profile")}
          >
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionIconText}>👤</Text>
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Profile</Text>
              <Text style={styles.quickActionSubtitle}>
                View your stats & progress
              </Text>
            </View>
            <Text style={styles.quickActionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate("Workouts")}
          >
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionIconText}>💪</Text>
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Workouts</Text>
              <Text style={styles.quickActionSubtitle}>
                Your training plans
              </Text>
            </View>
            <Text style={styles.quickActionArrow}>→</Text>
          </TouchableOpacity>

          {/* Tips Section */}
          <Text style={styles.sectionTitle}>Today's Tips</Text>
          <View style={styles.tipCard}>
            <View style={styles.tipDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Stay Hydrated</Text>
              <Text style={styles.tipText}>
                Drink 8-10 glasses of water daily
              </Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <View style={styles.tipDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Track Progress</Text>
              <Text style={styles.tipText}>
                Log your weight to monitor changes
              </Text>
            </View>
          </View>

          <View style={styles.spacing} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  premiumHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    marginBottom: 28,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
    lineHeight: 42,
  },
  headerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  headerStatItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
  },
  headerStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 14,
    marginBottom: 36,
  },
  statCard: {
    flex: 1,
    paddingVertical: 24,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...shadows.card,
  },
  statCard1: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  statCard2: {
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderColor: "rgba(255, 193, 7, 0.3)",
  },
  statCard3: {
    backgroundColor: "rgba(91, 127, 255, 0.1)",
    borderColor: "rgba(91, 127, 255, 0.3)",
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: 18,
    marginHorizontal: 24,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginBottom: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(91, 127, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  quickActionIconText: {
    fontSize: 26,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: palette.textSecondary,
    fontWeight: "500",
    lineHeight: 18,
  },
  quickActionArrow: {
    fontSize: 18,
    color: "#5B7FFF",
    fontWeight: "800",
  },
  tipCard: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#FFB800",
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFB800",
    marginRight: 14,
    marginTop: 4,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  tipText: {
    fontSize: 13,
    color: palette.textSecondary,
    lineHeight: 18,
    fontWeight: "500",
  },
  spacing: {
    height: 24,
  },
});

export default HomeScreen;
