import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../config/supabase";
import { palette, radii, shadows, spacing } from "../../theme";
import * as bunnyStream from "../../services/bunnyStream";

type Client = { id: string; name: string; email: string };
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

const ManageWorkoutsScreen = () => {
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(false);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);

  const [planForm, setPlanForm] = useState({ title: "", notes: "" });
  const [dayForm, setDayForm] = useState({ title: "" });
  const [exerciseForm, setExerciseForm] = useState({
    name: "",
    sets: "",
    reps: "",
    directions: "",
  });
  const [exerciseVideo, setExerciseVideo] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
    fetchPlans();
  }, []);

  const fetchClients = async () => {
    try {
      // Prefer linked clients; fallback to all clients if none are linked
      const scoped = await supabase
        .from("coach_clients")
        .select("client_id")
        .eq("coach_id", user?.id);

      if (scoped.error) throw scoped.error;
      const clientIds = (scoped.data || []).map((c) => c.client_id);

      const detailsQuery = clientIds.length
        ? supabase.from("users").select("id, email, name").in("id", clientIds)
        : supabase.from("users").select("id, email, name").eq("role", "client");

      const details = await detailsQuery;
      if (details.error) throw details.error;

      setClients(
        (details.data || []).map((c) => ({
          id: c.id,
          name: c.name || "Client",
          email: c.email || "",
        })),
      );
    } catch (error) {
      console.error("Error fetching clients", error);
      Alert.alert(
        "Clients unavailable",
        "Could not load clients. Check coach-client links or RLS policies.",
      );
      setClients([]);
    }
  };

  const openClientSelector = async () => {
    await fetchClients();
    if ((clients || []).length === 0) {
      Alert.alert(
        "No clients available",
        "Link clients to this coach first, or check RLS policies.",
      );
    }
    setShowClientSelector(true);
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const plansResp = await supabase
        .from("workout_plans")
        .select("*")
        .eq("coach_id", user?.id)
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
      console.error("Error fetching plans", error);
      Alert.alert("Error", "Failed to load workout plans");
    } finally {
      setLoading(false);
    }
  };

  const pickVideo = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Enable media library access");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
      });

      if (!result.canceled) {
        setExerciseVideo(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick video");
    }
  };

  const uploadVideoIfNeeded = async (
    uri: string | null,
    exerciseName?: string,
  ) => {
    if (!uri) return null;
    // If already a URL, return as is
    if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

    try {
      // Upload to Bunny Stream
      const fileName = `exercise-${Date.now()}.mp4`;
      const title = `${exerciseName || "Exercise"} - ${new Date().toLocaleDateString()}`;

      Alert.alert(
        "Uploading Video",
        "Please wait while video is being uploaded...",
      );

      const result = await bunnyStream.uploadVideo(
        title,
        uri,
        fileName,
        (progress) => {
          console.log(`Upload progress: ${progress}%`);
        },
      );

      if (result.success && result.playUrl) {
        Alert.alert("Success", "Video uploaded successfully!");
        return result.playUrl;
      } else {
        Alert.alert("Upload Failed", "Could not upload video to Bunny Stream");
        return null;
      }
    } catch (error) {
      console.error("Error uploading to Bunny Stream:", error);
      Alert.alert("Error", "Failed to upload video");
      return null;
    }
  };

  const createPlan = async () => {
    if (!planForm.title.trim()) {
      Alert.alert("Title required", "Add a plan title");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("workout_plans").insert([
        {
          title: planForm.title.trim(),
          notes: planForm.notes.trim() || null,
          coach_id: user?.id,
          client_id: selectedClient?.id || null,
        },
      ]);
      if (error) throw error;
      setShowPlanModal(false);
      setPlanForm({ title: "", notes: "" });
      setSelectedClient(null);
      fetchPlans();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create plan");
    } finally {
      setLoading(false);
    }
  };

  const createDay = async () => {
    if (!selectedPlan) {
      Alert.alert("Select plan", "Pick a plan first");
      return;
    }
    if (!dayForm.title.trim()) {
      Alert.alert("Title required", "Add a day title");
      return;
    }
    try {
      setLoading(true);
      const nextOrder = (selectedPlan.days?.length || 0) + 1;
      const { error } = await supabase.from("workout_days").insert([
        {
          plan_id: selectedPlan.id,
          title: dayForm.title.trim(),
          day_order: nextOrder,
        },
      ]);
      if (error) throw error;
      setShowDayModal(false);
      setDayForm({ title: "" });
      fetchPlans();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add day");
    } finally {
      setLoading(false);
    }
  };

  const createExercise = async () => {
    if (!selectedDay) {
      Alert.alert("Select day", "Pick a day first");
      return;
    }
    if (!exerciseForm.name.trim()) {
      Alert.alert("Name required", "Add an exercise name");
      return;
    }
    try {
      setLoading(true);
      const videoUrl = await uploadVideoIfNeeded(
        exerciseVideo,
        exerciseForm.name.trim(),
      );
      const { error } = await supabase.from("workout_exercises").insert([
        {
          day_id: selectedDay.id,
          name: exerciseForm.name.trim(),
          sets: exerciseForm.sets ? parseInt(exerciseForm.sets, 10) : null,
          reps: exerciseForm.reps ? parseInt(exerciseForm.reps, 10) : null,
          directions: exerciseForm.directions.trim() || null,
          video_url: videoUrl,
        },
      ]);
      if (error) throw error;
      setShowExerciseModal(false);
      setExerciseForm({ name: "", sets: "", reps: "", directions: "" });
      setExerciseVideo(null);
      fetchPlans();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add exercise");
    } finally {
      setLoading(false);
    }
  };

  const deleteExercise = async (exerciseId: string) => {
    Alert.alert(
      "Delete Exercise",
      "Are you sure you want to delete this exercise?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from("workout_exercises")
                .delete()
                .eq("id", exerciseId);

              if (error) throw error;
              fetchPlans();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to delete exercise",
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const groupedByClient = useMemo(() => {
    const byClient: Record<string, WorkoutPlan[]> = {};
    plans.forEach((p) => {
      const key = p.client_id || "__unassigned__";
      if (!byClient[key]) byClient[key] = [];
      byClient[key].push(p);
    });
    return byClient;
  }, [plans]);

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
        <Text style={styles.exerciseVideo}>🎥 Video attached</Text>
      ) : null}
      <View style={styles.exerciseActions}>
        <TouchableOpacity onPress={() => deleteExercise(ex.id)}>
          <Text style={styles.deleteText}>Delete Exercise</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDay = (day: WorkoutDay) => (
    <View key={day.id} style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{day.title}</Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setSelectedDay(day);
            setExerciseForm({ name: "", sets: "", reps: "", directions: "" });
            setExerciseVideo(null);
            setShowExerciseModal(true);
          }}
        >
          <Text style={styles.secondaryButtonText}>+ Exercise</Text>
        </TouchableOpacity>
      </View>
      {day.exercises.length === 0 ? (
        <Text style={styles.emptyInline}>No exercises yet</Text>
      ) : (
        day.exercises.map(renderExercise)
      )}
    </View>
  );

  const assignPlanToClient = async (
    planId: string,
    clientId: string | null,
  ) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("workout_plans")
        .update({ client_id: clientId })
        .eq("id", planId);

      if (error) throw error;
      Alert.alert(
        "Success",
        clientId
          ? "Plan assigned to client!"
          : "Plan marked as unassigned for all clients",
      );
      fetchPlans();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to assign plan");
    } finally {
      setLoading(false);
    }
  };

  const renderPlan = (plan: WorkoutPlan) => (
    <View key={plan.id} style={styles.planCard}>
      <View style={styles.planHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          {plan.notes ? (
            <Text style={styles.planNotes}>{plan.notes}</Text>
          ) : null}
          {!plan.client_id ? (
            <Text
              style={[styles.planNotes, { color: "#FF9500", marginTop: 4 }]}
            >
              ⚠️ Not assigned to any client
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setSelectedPlan(plan);
            setSelectedClient(
              clients.find((c) => c.id === plan.client_id) || null,
            );
            setShowClientSelector(true);
          }}
        >
          <Text style={styles.secondaryButtonText}>
            {plan.client_id ? "✓ Assigned" : "Assign"}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setSelectedPlan(plan);
            setDayForm({ title: "" });
            setShowDayModal(true);
          }}
        >
          <Text style={styles.secondaryButtonText}>+ Day</Text>
        </TouchableOpacity>
      </View>

      {plan.days.length === 0 ? (
        <Text style={styles.emptyInline}>No days yet</Text>
      ) : (
        plan.days.map(renderDay)
      )}
    </View>
  );

  const renderClientSection = (client: Client | null) => {
    const key = client ? client.id : "__unassigned__";
    const title = client ? `${client.name} (${client.email})` : "Unassigned";
    const clientPlans = groupedByClient[key] || [];

    if (clientPlans.length === 0) return null;

    return (
      <View key={key} style={styles.section}>
        <Text style={styles.sectionLabel}>{title}</Text>
        {clientPlans.map(renderPlan)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <LinearGradient
          colors={["#0E0C24", "#11172A", "#0F1F3A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>Workout Plans</Text>
          <Text style={styles.heroSubtitle}>
            Assign plans to clients, add days, and drop in exercises.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setSelectedClient(null);
              setPlanForm({ title: "", notes: "" });
              setShowPlanModal(true);
            }}
          >
            <Text style={styles.primaryButtonText}>+ Create Plan</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.body}>
          {loading && plans.length === 0 ? (
            <ActivityIndicator size="large" color="#7C83FF" />
          ) : plans.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>No plans yet</Text>
              <Text style={styles.emptySubtext}>
                Create a plan and assign a client
              </Text>
            </View>
          ) : (
            <View>
              {clients.map((c) => renderClientSection(c))}
              {renderClientSection(null)}
            </View>
          )}
        </View>

        {/* Plan modal */}
        <Modal visible={showPlanModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Workout Plan</Text>
                <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                  <Text style={styles.close}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Push/Pull/Legs"
                value={planForm.title}
                onChangeText={(t) => setPlanForm({ ...planForm, title: t })}
              />
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any guidelines"
                value={planForm.notes}
                onChangeText={(t) => setPlanForm({ ...planForm, notes: t })}
                multiline
              />
              <Text style={styles.label}>Assign to Client</Text>
              <TouchableOpacity
                style={[
                  styles.selectorButton,
                  selectedClient && {
                    backgroundColor: "rgba(124,131,255,0.15)",
                  },
                ]}
                onPress={openClientSelector}
              >
                <Text style={styles.selectorText}>
                  {selectedClient
                    ? `✓ ${selectedClient.name}`
                    : "+ Tap to assign client"}
                </Text>
              </TouchableOpacity>
              {selectedClient ? (
                <TouchableOpacity
                  style={{ marginTop: spacing.xs }}
                  onPress={() => setSelectedClient(null)}
                >
                  <Text style={styles.clearLink}>✕ Remove assignment</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.clearLink, { marginTop: spacing.xs }]}>
                  Leave empty to assign manually later
                </Text>
              )}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={createPlan}
              >
                <Text style={styles.primaryButtonText}>Save Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Day modal */}
        <Modal visible={showDayModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Add Day to {selectedPlan?.title}
                </Text>
                <TouchableOpacity onPress={() => setShowDayModal(false)}>
                  <Text style={styles.close}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Day Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Push Day"
                value={dayForm.title}
                onChangeText={(t) => setDayForm({ title: t })}
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={createDay}
              >
                <Text style={styles.primaryButtonText}>Add Day</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Exercise modal */}
        <Modal visible={showExerciseModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Exercise for {selectedDay?.title}
                </Text>
                <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
                  <Text style={styles.close}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Bench Press"
                value={exerciseForm.name}
                onChangeText={(t) =>
                  setExerciseForm({ ...exerciseForm, name: t })
                }
              />
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.label}>Sets</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder="3"
                    value={exerciseForm.sets}
                    onChangeText={(t) =>
                      setExerciseForm({ ...exerciseForm, sets: t })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Reps</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder="10"
                    value={exerciseForm.reps}
                    onChangeText={(t) =>
                      setExerciseForm({ ...exerciseForm, reps: t })
                    }
                  />
                </View>
              </View>
              <Text style={styles.label}>Directions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                placeholder="Keep elbows tucked"
                value={exerciseForm.directions}
                onChangeText={(t) =>
                  setExerciseForm({ ...exerciseForm, directions: t })
                }
              />
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={pickVideo}
              >
                <Text style={styles.selectorText}>
                  {exerciseVideo
                    ? "🎥 Video selected"
                    : "Attach video (optional)"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={createExercise}
              >
                <Text style={styles.primaryButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Client selector */}
        <Modal visible={showClientSelector} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: "80%" }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedPlan ? "Assign to Client" : "Select Client"}
                </Text>
                <TouchableOpacity onPress={() => setShowClientSelector(false)}>
                  <Text style={styles.close}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={clients}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.clientRow}
                    onPress={() => {
                      if (selectedPlan) {
                        assignPlanToClient(selectedPlan.id, item.id);
                      } else {
                        setSelectedClient(item);
                      }
                      setShowClientSelector(false);
                    }}
                  >
                    <Text style={styles.clientName}>👤 {item.name}</Text>
                    <Text style={styles.clientEmail}>{item.email}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyInline}>No clients available</Text>
                }
              />
              {selectedPlan && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: palette.border,
                    padding: spacing.md,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      assignPlanToClient(selectedPlan.id, null);
                      setShowClientSelector(false);
                    }}
                    style={{
                      padding: spacing.md,
                      backgroundColor: "rgba(0,0,0,0.05)",
                      borderRadius: radii.md,
                    }}
                  >
                    <Text style={styles.clientName}>
                      Unassign (available to all)
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  hero: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: "#7C83FF",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    alignSelf: "flex-start",
    ...shadows.button,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  body: { padding: spacing.lg },
  emptyState: { alignItems: "center", paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 42, marginBottom: spacing.sm },
  emptyText: { fontSize: 18, fontWeight: "700", color: palette.textPrimary },
  emptySubtext: { color: palette.textSecondary },
  section: { marginBottom: spacing.xl },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: spacing.sm,
  },
  planCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(124,131,255,0.2)",
    ...shadows.card,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  planTitle: { fontSize: 18, fontWeight: "700", color: palette.textPrimary },
  planNotes: { color: palette.textSecondary, marginTop: 2 },
  dayCard: {
    backgroundColor: "rgba(124,131,255,0.05)",
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  dayTitle: { fontSize: 15, fontWeight: "700", color: palette.textPrimary },
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  exerciseName: { fontWeight: "700", color: palette.textPrimary },
  exerciseMeta: { color: palette.textSecondary, marginTop: 2 },
  exerciseDirections: { color: palette.textSecondary, marginTop: 4 },
  exerciseVideo: { color: "#7C83FF", marginTop: 4, fontWeight: "600" },
  exerciseActions: { marginTop: spacing.sm, alignItems: "flex-end" },
  deleteText: { color: "#D32F2F", fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(124,131,255,0.6)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  secondaryButtonText: { color: "#7C83FF", fontWeight: "700" },
  emptyInline: { color: palette.textSecondary, marginTop: spacing.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: palette.textPrimary },
  close: { fontSize: 22, color: palette.textPrimary },
  label: {
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(124,131,255,0.4)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
  },
  textArea: { minHeight: 80, textAlignVertical: "top", marginTop: spacing.xs },
  selectorButton: {
    borderWidth: 1,
    borderColor: "rgba(124,131,255,0.4)",
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  selectorText: { color: palette.textPrimary },
  clearLink: { color: palette.textSecondary, marginTop: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  clientRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  clientName: { fontWeight: "700", color: palette.textPrimary },
  clientEmail: { color: palette.textSecondary },
});

export default ManageWorkoutsScreen;
