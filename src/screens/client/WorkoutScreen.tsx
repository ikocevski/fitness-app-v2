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
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../config/supabase";
import { palette, radii, spacing, typography, shadows } from "../../theme";
import VideoPlayer from "../../components/common/VideoPlayer";

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

const WorkoutScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkoutPlans();
  }, []);

  const fetchWorkoutPlans = async () => {
    try {
      setLoading(true);
      // Fetch plans assigned to this client
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

  const renderExercise = (ex: WorkoutExercise) => (
    <View key={ex.id} style={styles.exerciseCard}>
      <Text style={styles.exerciseName}>{ex.name}</Text>
      <Text style={styles.exerciseMeta}>
        {ex.sets ? `${ex.sets} sets` : ""}
        {ex.sets && ex.reps ? " · " : ""}
        {ex.reps ? `${ex.reps} reps` : ""}
      </Text>
      {ex.directions ? (
        <Text style={styles.exerciseDirections}>{ex.directions}</Text>
      ) : null}
      {ex.video_url ? (
        <View style={styles.videoContainer}>
          <VideoPlayer videoUrl={ex.video_url} />
          <Text style={styles.videoHint}>
            If video fails first time, wait 1-2 min and retry.
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderDay = (day: WorkoutDay) => (
    <View key={day.id} style={styles.dayCard}>
      <Text style={styles.dayTitle}>{day.title}</Text>
      {day.exercises.length === 0 ? (
        <Text style={styles.emptyInline}>No exercises</Text>
      ) : (
        day.exercises.map(renderExercise)
      )}
    </View>
  );

  const renderPlan = (plan: WorkoutPlan) => (
    <View key={plan.id} style={styles.planCard}>
      <Text style={styles.planTitle}>{plan.title}</Text>
      {plan.notes ? <Text style={styles.planNotes}>{plan.notes}</Text> : null}
      {plan.days.length === 0 ? (
        <Text style={styles.emptyInline}>No days yet</Text>
      ) : (
        plan.days.map(renderDay)
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Workouts</Text>
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7C83FF" />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Your Workout Plans</Text>
        </View>

        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💪</Text>
            <Text style={styles.emptyText}>No workout plans assigned yet</Text>
            <Text style={styles.emptySubtext}>
              Your coach will create a plan for you soon!
            </Text>
          </View>
        ) : (
          <View style={styles.body}>{plans.map(renderPlan)}</View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    backgroundColor: "#5B7FFF",
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.4,
  },
  emptySubtext: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  body: {
    padding: spacing.lg,
  },
  planCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#5B7FFF",
    marginBottom: spacing.sm,
    letterSpacing: -0.4,
  },
  planNotes: {
    color: palette.textSecondary,
    marginBottom: spacing.md,
  },
  dayCard: {
    backgroundColor: "rgba(91, 127, 255, 0.1)",
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: "#5B7FFF",
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  exerciseCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
  },
  exerciseName: {
    fontWeight: "700",
    color: palette.textPrimary,
  },
  exerciseMeta: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  exerciseDirections: {
    color: palette.textSecondary,
    marginTop: 4,
  },
  videoContainer: {
    marginTop: spacing.sm,
  },
  videoHint: {
    marginTop: 6,
    color: palette.textSecondary,
    fontSize: 12,
  },
  emptyInline: {
    color: palette.textSecondary,
    marginTop: spacing.xs,
  },
});

export default WorkoutScreen;
