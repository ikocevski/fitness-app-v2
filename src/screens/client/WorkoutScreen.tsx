import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../config/supabase";
import { palette, radii, spacing, shadows } from "../../theme";
import VideoPlayer from "../../components/common/VideoPlayer";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";

type WorkoutExercise = {
  id: string;
  day_id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  directions?: string | null;
  video_url?: string | null;
};

type WorkoutDay = {
  id: string;
  plan_id: string;
  title: string;
  day_order: number | null;
  exercises: WorkoutExercise[];
};

type WorkoutPlan = {
  id: string;
  title: string;
  notes?: string | null;
  client_id: string | null;
  coach_id: string;
  days: WorkoutDay[];
};

const WorkoutScreen = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openVideoExerciseId, setOpenVideoExerciseId] = useState<string | null>(
    null,
  );
  const [openNotesExerciseId, setOpenNotesExerciseId] = useState<string | null>(
    null,
  );
  const [fullscreenVideoUrl, setFullscreenVideoUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    fetchWorkoutPlans();
  }, []);

  const fetchWorkoutPlans = async () => {
    try {
      setLoading(true);
      const plansResp = await supabase
        .from("workout_plans")
        .select("*")
        .eq("client_id", user?.id)
        .order("created_at", { ascending: false });

      if (plansResp.error) throw plansResp.error;
      const planRows = plansResp.data || [];
      if (planRows.length === 0) {
        setPlans([]);
        return;
      }

      const planIds = planRows.map((p) => p.id);
      const daysResp = await supabase
        .from("workout_days")
        .select("*")
        .in("plan_id", planIds)
        .order("day_order", { ascending: true });
      if (daysResp.error) throw daysResp.error;
      const dayRows = daysResp.data || [];

      const dayIds = dayRows.map((d) => d.id);
      const exResp = dayIds.length
        ? await supabase
            .from("workout_exercises")
            .select("*")
            .in("day_id", dayIds)
            .order("created_at", { ascending: true })
        : { data: [], error: null };
      if ((exResp as any).error) throw (exResp as any).error;
      const exRows: WorkoutExercise[] = (exResp as any).data || [];

      const exercisesByDay = exRows.reduce<Record<string, WorkoutExercise[]>>(
        (acc, ex) => {
          if (!acc[ex.day_id]) acc[ex.day_id] = [];
          acc[ex.day_id].push(ex);
          return acc;
        },
        {},
      );

      const daysByPlan = dayRows.reduce<Record<string, WorkoutDay[]>>(
        (acc, d: any) => {
          if (!acc[d.plan_id]) acc[d.plan_id] = [];
          acc[d.plan_id].push({
            id: d.id,
            plan_id: d.plan_id,
            title: d.title,
            day_order: d.day_order,
            exercises: exercisesByDay[d.id] || [],
          });
          return acc;
        },
        {},
      );

      const nested = planRows.map((p: any) => ({
        id: p.id,
        title: p.title,
        notes: p.notes,
        client_id: p.client_id,
        coach_id: p.coach_id,
        days: daysByPlan[p.id] || [],
      }));

      setPlans(nested);
    } catch (error) {
      console.error("Error fetching workout plans", error);
      Alert.alert("Error", "Failed to load workout plans");
    } finally {
      setLoading(false);
    }
  };

  const renderExercise = (ex: WorkoutExercise) => {
    const isVideoOpen = openVideoExerciseId === ex.id;
    const isNotesOpen = openNotesExerciseId === ex.id;

    return (
      <View key={ex.id} style={styles.exerciseCard}>
        <View style={styles.exerciseHeaderRow}>
          <Text style={styles.exerciseName}>{ex.name}</Text>
          {ex.video_url ? (
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>VIDEO</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>SETS</Text>
            <Text style={styles.metricValue}>{ex.sets ?? "-"}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>REPS</Text>
            <Text style={styles.metricValue}>{ex.reps ?? "-"}</Text>
          </View>
        </View>

        <View style={styles.exerciseActionsRow}>
          {ex.video_url ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                setOpenVideoExerciseId((prev) =>
                  prev === ex.id ? null : ex.id,
                )
              }
            >
              <Text style={styles.actionButtonText}>
                {isVideoOpen ? "Hide Video" : "Watch Video"}
              </Text>
            </TouchableOpacity>
          ) : null}

          {ex.directions ? (
            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() =>
                setOpenNotesExerciseId((prev) =>
                  prev === ex.id ? null : ex.id,
                )
              }
            >
              <Text style={styles.actionButtonSecondaryText}>
                {isNotesOpen ? "Hide Notes" : "View Notes"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {isNotesOpen && ex.directions ? (
          <Text style={styles.exerciseDirections}>{ex.directions}</Text>
        ) : null}

        {isVideoOpen && ex.video_url ? (
          <View style={styles.videoContainer}>
            <VideoPlayer videoUrl={ex.video_url} />
            <TouchableOpacity
              style={styles.fullVideoButton}
              onPress={() => setFullscreenVideoUrl(ex.video_url!)}
            >
              <Text style={styles.fullVideoButtonText}>Open Full Video</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#6C7BFF", "#4A68E6", "#2D46B9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.title}>Your Workouts</Text>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7C83FF" />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#6C7BFF", "#4A68E6", "#2D46B9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.title}>Your Workout Plans</Text>
          <Text style={styles.headerSubtitle}>
            Train with structure. Track every set with focus.
          </Text>
        </LinearGradient>

        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconBadge}>
                <Text style={styles.emptyIcon}>💪</Text>
              </View>
              <Text style={styles.emptyText}>No Workout Plan Assigned Yet</Text>
              <Text style={styles.emptySubtext}>
                Your coach will publish your training plan soon. Check back
                later.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.body}>
            {plans.map((plan) => (
              <View key={plan.id} style={styles.planCard}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                {plan.notes ? (
                  <Text style={styles.planNotes}>{plan.notes}</Text>
                ) : null}

                {plan.days.length === 0 ? (
                  <Text style={styles.emptyInline}>
                    No days in this plan yet
                  </Text>
                ) : (
                  plan.days.map((day) => (
                    <View key={day.id} style={styles.dayCard}>
                      <Text style={styles.dayTitle}>{day.title}</Text>
                      {day.exercises.length === 0 ? (
                        <Text style={styles.emptyInline}>
                          No exercises for this day
                        </Text>
                      ) : (
                        day.exercises.map(renderExercise)
                      )}
                    </View>
                  ))
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!fullscreenVideoUrl}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setFullscreenVideoUrl(null)}
      >
        <View style={styles.fullscreenContainer}>
          {fullscreenVideoUrl && (
            <WebView
              source={{ uri: fullscreenVideoUrl }}
              style={styles.webview}
              javaScriptEnabled={true}
              allowsFullscreenVideo={true}
            />
          )}

          <TouchableOpacity
            style={styles.floatingCloseButton}
            onPress={() => setFullscreenVideoUrl(null)}
          >
            <Text style={styles.floatingCloseButtonText}>✕</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeHintBar}
            onPress={() => setFullscreenVideoUrl(null)}
          >
            <Text style={styles.closeHintText}>Close Video</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    marginTop: spacing.xs,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  emptyStateCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(108,123,255,0.30)",
    backgroundColor: "rgba(28, 33, 40, 0.92)",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    ...shadows.card,
  },
  emptyIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(108,123,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(108,123,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyIcon: {
    fontSize: 30,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  emptySubtext: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 290,
  },
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  planCard: {
    backgroundColor: "rgba(28, 33, 40, 0.92)",
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(108, 123, 255, 0.35)",
    ...shadows.card,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#8FA0FF",
    letterSpacing: -0.4,
    marginBottom: spacing.xs,
  },
  planNotes: {
    color: palette.textSecondary,
    marginBottom: spacing.md,
  },
  dayCard: {
    backgroundColor: "rgba(108, 123, 255, 0.10)",
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: "#8FA0FF",
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  exerciseCard: {
    backgroundColor: "rgba(34, 39, 46, 0.95)",
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(110, 125, 255, 0.28)",
  },
  exerciseHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  videoBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(91,127,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(91,127,255,0.45)",
  },
  videoBadgeText: {
    color: "#DCE2FF",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.4,
  },
  exerciseName: {
    fontWeight: "700",
    color: palette.textPrimary,
    fontSize: 15,
    flex: 1,
  },
  metricsRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 17, 23, 0.5)",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(108,123,255,0.2)",
    paddingVertical: spacing.sm,
  },
  metricBlock: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  metricDivider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(108,123,255,0.35)",
  },
  exerciseActionsRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(124,131,255,0.45)",
    backgroundColor: "rgba(124,131,255,0.14)",
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#DCE2FF",
    fontWeight: "700",
    fontSize: 13,
  },
  actionButtonSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(143,160,255,0.35)",
    backgroundColor: "rgba(143,160,255,0.1)",
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  actionButtonSecondaryText: {
    color: "#DCE2FF",
    fontWeight: "600",
    fontSize: 13,
  },
  exerciseDirections: {
    color: palette.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  videoContainer: {
    marginTop: spacing.sm,
  },
  fullVideoButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(124,131,255,0.45)",
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    backgroundColor: "rgba(124,131,255,0.14)",
  },
  fullVideoButtonText: {
    color: "#DCE2FF",
    fontWeight: "700",
    fontSize: 13,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: palette.background,
  },
  floatingCloseButton: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    elevation: 8,
  },
  floatingCloseButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    lineHeight: 20,
  },
  closeHintBar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(124,131,255,0.45)",
    backgroundColor: "rgba(20,24,32,0.86)",
    paddingVertical: spacing.sm,
    alignItems: "center",
    zIndex: 15,
    elevation: 6,
  },
  closeHintText: {
    color: "#DCE2FF",
    fontWeight: "700",
    fontSize: 14,
  },
  webview: {
    flex: 1,
  },
  emptyInline: {
    color: palette.textSecondary,
    marginTop: spacing.xs,
  },
});

export default WorkoutScreen;
