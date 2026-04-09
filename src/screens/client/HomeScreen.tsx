import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import WeightModal from "../../components/common/WeightModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../config/supabase";
import { palette, radii, spacing, shadows, typography } from "../../theme";
import * as Notifications from "expo-notifications";

const SESSION_REMINDER_ID_KEY = "sessionReminderNotificationId";
const SESSION_REMINDER_SESSION_KEY = "sessionReminderSessionKey";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type UpcomingSession = {
  id: string;
  title: string;
  session_at: string;
  duration_minutes: number;
  status: string;
  coach_id: string;
  coach_name: string;
};

const HomeScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({
    sessions: 0,
    calories: 0,
  });
  const [upcomingSession, setUpcomingSession] =
    useState<UpcomingSession | null>(null);

  useEffect(() => {
    if (user?.id) {
      checkDailyWeightLog();
      loadTodayStats();
      calculateStreak();
      fetchUpcomingSession();
      configureNotificationChannel();
    }
  }, [user?.id]);

  const configureNotificationChannel = async () => {
    if (Platform.OS !== "android") return;
    try {
      await Notifications.setNotificationChannelAsync("session-reminders", {
        name: "Session Reminders",
        importance: Notifications.AndroidImportance.HIGH,
      });
    } catch (error) {
      console.error("Error configuring notification channel:", error);
    }
  };

  const clearSessionReminder = async () => {
    const existingNotificationId = await AsyncStorage.getItem(
      SESSION_REMINDER_ID_KEY,
    );

    if (existingNotificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(
          existingNotificationId,
        );
      } catch (error) {
        console.error("Error cancelling existing reminder:", error);
      }
    }

    await AsyncStorage.multiRemove([
      SESSION_REMINDER_ID_KEY,
      SESSION_REMINDER_SESSION_KEY,
    ]);
  };

  const ensureNotificationPermission = async () => {
    const currentPermission = await Notifications.getPermissionsAsync();
    if (currentPermission.granted) return true;

    const requestedPermission = await Notifications.requestPermissionsAsync();
    return requestedPermission.granted;
  };

  const syncSessionReminder = async (session: UpcomingSession) => {
    const sessionKey = `${session.id}:${session.session_at}`;
    const savedSessionKey = await AsyncStorage.getItem(
      SESSION_REMINDER_SESSION_KEY,
    );

    if (savedSessionKey === sessionKey) return;

    await clearSessionReminder();

    const triggerDate = new Date(
      new Date(session.session_at).getTime() - 30 * 60 * 1000,
    );

    if (triggerDate.getTime() <= Date.now()) return;

    const hasPermission = await ensureNotificationPermission();
    if (!hasPermission) return;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Session Reminder",
        body: `${session.title} starts in 30 minutes with ${session.coach_name}.`,
        sound: true,
      },
      trigger:
        Platform.OS === "android"
          ? {
              channelId: "session-reminders",
              date: triggerDate,
            }
          : {
              date: triggerDate,
            },
    });

    await AsyncStorage.multiSet([
      [SESSION_REMINDER_ID_KEY, notificationId],
      [SESSION_REMINDER_SESSION_KEY, sessionKey],
    ]);
  };

  const fetchUpcomingSession = async () => {
    try {
      if (!user?.id) {
        setUpcomingSession(null);
        return;
      }

      const { data: sessions, error: sessionError } = await supabase
        .from("coach_sessions")
        .select("id,title,session_at,duration_minutes,status,coach_id")
        .eq("client_id", user.id)
        .in("status", ["scheduled", "booked", "requested"])
        .gte("session_at", new Date().toISOString())
        .order("session_at", { ascending: true })
        .limit(10);

      if (sessionError) throw sessionError;

      const nextSession = (sessions || [])[0];

      if (!nextSession) {
        setUpcomingSession(null);
        await clearSessionReminder();
        return;
      }

      const { data: coachData, error: coachError } = await supabase
        .from("users")
        .select("name,email")
        .eq("id", nextSession.coach_id)
        .maybeSingle();

      if (coachError) {
        console.log("Coach profile fetch warning:", coachError.message);
      }

      const sessionWithCoach: UpcomingSession = {
        ...nextSession,
        coach_name: coachData?.name || coachData?.email || "Coach",
      };

      setUpcomingSession(sessionWithCoach);
      await syncSessionReminder(sessionWithCoach);
    } catch (error) {
      console.error("Error fetching upcoming session:", error);
    }
  };

  const formatSessionDateTime = (value: string) => {
    return new Date(value).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
      if (!user?.id) {
        setStats({ sessions: 0, calories: 0 });
        return;
      }

      let sessionsCount = 0;
      let caloriesCount = 0;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const nextWeek = new Date(todayStart);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: workoutPlans, error: workoutPlansError } = await supabase
        .from("workout_plans")
        .select("id")
        .eq("client_id", user.id);

      if (workoutPlansError) throw workoutPlansError;

      const planIds = (workoutPlans || []).map((plan) => plan.id);
      if (planIds.length > 0) {
        const { data: workoutDays, error: workoutDaysError } = await supabase
          .from("workout_days")
          .select("id")
          .in("plan_id", planIds);

        if (workoutDaysError) throw workoutDaysError;

        sessionsCount = (workoutDays || []).length;
      }

      const { data: dietPlans, error: dietPlansError } = await supabase
        .from("diet_plans")
        .select("calories,protein,carbs,fats")
        .eq("user_id", user.id);

      if (dietPlansError) throw dietPlansError;

      if ((dietPlans || []).length > 0) {
        caloriesCount = (dietPlans || []).reduce((total, plan: any) => {
          const protein = Number(plan.protein) || 0;
          const carbs = Number(plan.carbs) || 0;
          const fats = Number(plan.fats) || 0;
          const caloriesFromMacros = protein * 4 + carbs * 4 + fats * 9;
          const caloriesTarget = Number(plan.calories) || 0;
          return total + Math.max(caloriesTarget, caloriesFromMacros);
        }, 0);
      } else {
        const { data: directMeals, error: directMealsError } = await supabase
          .from("diet_meals")
          .select("calories")
          .eq("assigned_to_client_id", user.id);

        if (directMealsError) throw directMealsError;

        caloriesCount = (directMeals || []).reduce(
          (total, meal: any) => total + (Number(meal.calories) || 0),
          0,
        );
      }

      setStats({
        sessions: sessionsCount,
        calories: Math.round(caloriesCount),
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats({ sessions: 0, calories: 0 });
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
          <LinearGradient
            colors={["#5B7FFF", "#4A68E6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumHeader}
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.userName}>{user?.name || "Athlete"}</Text>
              </View>
            </View>
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatLabel}>Streak</Text>
                <Text style={styles.headerStatValue}>{streak} days</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.statCard1]}>
              <Text style={styles.statIcon}>🏋️</Text>
              <Text style={styles.statValue}>{stats.sessions}</Text>
              <Text style={styles.statLabel}>SESSIONS THIS WEEK</Text>
            </View>
            <View style={[styles.statCard, styles.statCard2]}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={styles.statValue}>{stats.calories}</Text>
              <Text style={styles.statLabel}>DAILY KCAL</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Scheduled Session</Text>
          {upcomingSession ? (
            <View style={styles.sessionCard}>
              <View style={styles.sessionBadge}>
                <Text style={styles.sessionBadgeText}>UPCOMING</Text>
              </View>
              <Text style={styles.sessionTitle}>{upcomingSession.title}</Text>
              <Text style={styles.sessionMeta}>
                {formatSessionDateTime(upcomingSession.session_at)}
              </Text>
              <Text style={styles.sessionMeta}>
                Coach: {upcomingSession.coach_name} • Duration:{" "}
                {upcomingSession.duration_minutes} min
              </Text>
              <Text style={styles.sessionHint}>
                You will receive a reminder 30 minutes before this session.
              </Text>
            </View>
          ) : (
            <View style={styles.sessionCardEmpty}>
              <Text style={styles.sessionEmptyTitle}>No session scheduled</Text>
              <Text style={styles.sessionEmptyText}>
                Your coach will schedule your next session soon.
              </Text>
            </View>
          )}

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
    justifyContent: "flex-start",
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
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
    lineHeight: 34,
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
  sessionCard: {
    marginHorizontal: 24,
    marginBottom: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(91,127,255,0.35)",
    ...shadows.card,
  },
  sessionBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(91,127,255,0.5)",
    backgroundColor: "rgba(91,127,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  sessionBadgeText: {
    color: "#DCE2FF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  sessionTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  sessionMeta: {
    color: palette.textSecondary,
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  sessionHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#A6B3FF",
  },
  sessionCardEmpty: {
    marginHorizontal: 24,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sessionEmptyTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  sessionEmptyText: {
    fontSize: 13,
    color: palette.textSecondary,
    lineHeight: 18,
  },
  spacing: {
    height: 24,
  },
});

export default HomeScreen;
