import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../config/supabase";
import { palette, radii, spacing, shadows } from "../../theme";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_type?: string | null;
  description?: string;
  ingredients?: string;
  image_url?: string;
}

type MealAssignment = {
  assignment_id: string;
  meal_type: string;
  display_order: number;
  meal: Meal;
};

const MEAL_SECTIONS = [
  { key: "breakfast", label: "Breakfast", icon: "🌅" },
  { key: "lunch", label: "Lunch", icon: "🥙" },
  { key: "dinner", label: "Dinner", icon: "🍽️" },
  { key: "pre-workout", label: "Pre-Workout", icon: "⚡" },
  { key: "snack", label: "Snack", icon: "🥜" },
  { key: "uncategorized", label: "Uncategorized", icon: "📂" },
];

const normalizeMealType = (value?: string | null) => {
  if (!value) return "uncategorized";
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-");
  return MEAL_SECTIONS.some((section) => section.key === normalized)
    ? normalized
    : "uncategorized";
};

interface AssignedPlan {
  id: string;
  name: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const getPlanTimestamp = (plan: AssignedPlan) => {
  const raw = plan.updated_at || plan.created_at;
  const timestamp = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const DietScreen = () => {
  const { user } = useAuth();
  const [mealAssignments, setMealAssignments] = useState<MealAssignment[]>([]);
  const [assignedPlans, setAssignedPlans] = useState<AssignedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDietPlan();
  }, []);

  const fetchDietPlan = async () => {
    try {
      console.log("[fetchDietPlan] Fetching meals for user ID:", user?.id);
      if (!user?.id) {
        setMealAssignments([]);
        return;
      }

      // Fetch directly assigned meals
      const { data: directMeals, error: directError } = await supabase
        .from("diet_meals")
        .select("*")
        .eq("assigned_to_client_id", user.id)
        .order("created_at", { ascending: false });

      if (directError) {
        console.log("[fetchDietPlan] Direct meals error:", directError);
      }

      // Fetch assigned plan IDs
      const { data: assignedPlans, error: planError } = await supabase
        .from("diet_plans")
        .select(
          "id, name, calories, protein, carbs, fats, created_by, created_at, updated_at",
        )
        .eq("user_id", user.id);

      if (planError) {
        console.log("[fetchDietPlan] Plan meals error:", planError);
      }

      const planRows = (assignedPlans || []) as AssignedPlan[];
      setAssignedPlans(planRows);

      const activePlan = [...planRows].sort(
        (first, second) => getPlanTimestamp(second) - getPlanTimestamp(first),
      )[0];

      const planIds = activePlan ? [activePlan.id] : [];

      let planAssignments: Array<{
        diet_meal_id: string;
        meal_type: string;
        display_order: number;
        diet_plan_id: string;
      }> = [];

      let mealsFromPlans: Meal[] = [];
      if (planIds.length > 0) {
        const { data: planMealsRows, error: planMealsError } = await supabase
          .from("diet_plan_meals")
          .select("diet_meal_id,meal_type,display_order,diet_plan_id")
          .in("diet_plan_id", planIds);

        if (planMealsError) {
          console.log("[fetchDietPlan] diet_plan_meals error:", planMealsError);
        } else {
          planAssignments = (planMealsRows || []) as Array<{
            diet_meal_id: string;
            meal_type: string;
            display_order: number;
            diet_plan_id: string;
          }>;
        }

        const mealIds = Array.from(
          new Set((planAssignments || []).map((row) => row.diet_meal_id)),
        );

        if (mealIds.length > 0) {
          const { data: linkedMeals, error: linkedMealsError } = await supabase
            .from("diet_meals")
            .select("*")
            .in("id", mealIds);

          if (linkedMealsError) {
            console.log(
              "[fetchDietPlan] Linked meals error:",
              linkedMealsError,
            );
          } else {
            mealsFromPlans = (linkedMeals || []) as Meal[];
          }
        }
      }

      const mealById = new Map<string, Meal>();
      (directMeals || []).forEach((meal) => {
        mealById.set(meal.id, meal as Meal);
      });
      mealsFromPlans.forEach((meal) => {
        mealById.set(meal.id, meal);
      });

      const mergedAssignments: MealAssignment[] = [];

      (directMeals || []).forEach((meal: any) => {
        mergedAssignments.push({
          assignment_id: `direct:${meal.id}`,
          meal_type: normalizeMealType(meal.meal_type),
          display_order: 999,
          meal,
        });
      });

      planAssignments.forEach((assignment) => {
        const meal = mealById.get(assignment.diet_meal_id);
        if (!meal) return;
        mergedAssignments.push({
          assignment_id: `plan:${assignment.diet_plan_id}:${assignment.diet_meal_id}:${assignment.meal_type}:${assignment.display_order}`,
          meal_type: normalizeMealType(assignment.meal_type || meal.meal_type),
          display_order: assignment.display_order ?? 999,
          meal,
        });
      });

      const uniqueAssignments = Array.from(
        new Map(
          mergedAssignments.map((assignment) => [
            `${assignment.assignment_id}`,
            assignment,
          ]),
        ).values(),
      );

      console.log("[fetchDietPlan] Fetched meals:", {
        direct: directMeals?.length || 0,
        fromPlans: mealsFromPlans.length,
        total: uniqueAssignments.length,
      });

      setMealAssignments(uniqueAssignments);
    } catch (error) {
      console.error("Error fetching diet meals:", error);
    } finally {
      setLoading(false);
    }
  };

  const toNumber = (value: unknown) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const activeAssignedPlan = [...assignedPlans].sort(
    (first, second) => getPlanTimestamp(second) - getPlanTimestamp(first),
  )[0];

  const planTargets = (() => {
    if (!activeAssignedPlan) {
      return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }

    const protein = toNumber(activeAssignedPlan.protein);
    const carbs = toNumber(activeAssignedPlan.carbs);
    const fats = toNumber(activeAssignedPlan.fats);
    const caloriesFromMacros = protein * 4 + carbs * 4 + fats * 9;
    const calories = Math.max(
      toNumber(activeAssignedPlan.calories),
      caloriesFromMacros,
    );

    return {
      calories,
      protein,
      carbs,
      fats,
    };
  })();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B7FFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Your Diet Plan</Text>
          <Text style={styles.subtitle}>Personalized meal plan</Text>
        </View>

        {mealAssignments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBadge}>
                <Text style={styles.emptyIcon}>🥗</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {assignedPlans.length > 0
                  ? "Diet Plan Assigned"
                  : "No Diet Plan Yet"}
              </Text>
              <Text style={styles.emptyText}>
                {assignedPlans.length > 0
                  ? "Your coach assigned a plan, but no meals are attached yet."
                  : "Your coach will create a personalized nutrition plan for you soon."}
              </Text>
              {assignedPlans.length > 0 ? (
                <View style={styles.assignedPlansBox}>
                  <Text style={styles.assignedPlansTitle}>Assigned Plans</Text>
                  {assignedPlans.map((plan) => (
                    <Text key={plan.id} style={styles.assignedPlanItem}>
                      • {plan.name}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <>
            {/* Plan Target Summary */}
            <View style={styles.macrosSummary}>
              <Text style={styles.summaryTitle}>Plan Daily Targets</Text>
              {activeAssignedPlan ? (
                <>
                  {assignedPlans.length > 1 && (
                    <Text style={styles.emptyStateHint}>
                      Multiple plans detected. Showing newest plan targets (
                      {activeAssignedPlan.name}).
                    </Text>
                  )}
                  <View style={styles.totalsGrid}>
                    <View style={styles.totalCard}>
                      <Text style={styles.totalLabel}>Calories</Text>
                      <Text style={styles.totalValue}>
                        {Math.round(planTargets.calories)}
                      </Text>
                      <Text style={styles.totalUnit}>kcal</Text>
                    </View>
                    <View style={styles.totalCard}>
                      <Text style={styles.totalLabel}>Protein</Text>
                      <Text style={styles.totalValue}>
                        {Math.round(planTargets.protein)}
                      </Text>
                      <Text style={styles.totalUnit}>g</Text>
                    </View>
                    <View style={styles.totalCard}>
                      <Text style={styles.totalLabel}>Carbs</Text>
                      <Text style={styles.totalValue}>
                        {Math.round(planTargets.carbs)}
                      </Text>
                      <Text style={styles.totalUnit}>g</Text>
                    </View>
                    <View style={styles.totalCard}>
                      <Text style={styles.totalLabel}>Fats</Text>
                      <Text style={styles.totalValue}>
                        {Math.round(planTargets.fats)}
                      </Text>
                      <Text style={styles.totalUnit}>g</Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={styles.emptyStateHint}>
                  No macro targets set yet.
                </Text>
              )}
            </View>

            {/* Meals List */}
            <View style={styles.mealsContainer}>
              <Text style={styles.mealsTitle}>Meals by Section</Text>
              {MEAL_SECTIONS.map((section) => {
                const sectionMeals = mealAssignments
                  .filter((assignment) => assignment.meal_type === section.key)
                  .sort(
                    (first, second) =>
                      first.display_order - second.display_order,
                  );

                if (sectionMeals.length === 0) return null;

                return (
                  <View key={section.key} style={styles.mealSectionCard}>
                    <View style={styles.mealSectionHeader}>
                      <Text style={styles.mealSectionTitle}>
                        {section.icon} {section.label}
                      </Text>
                      <Text style={styles.mealSectionCount}>
                        {sectionMeals.length}
                      </Text>
                    </View>

                    {sectionMeals.map((assignment) => {
                      const meal = assignment.meal;
                      return (
                        <View
                          key={assignment.assignment_id}
                          style={styles.mealCard}
                        >
                          <View style={styles.mealHeader}>
                            <Text style={styles.mealIcon}>🍽️</Text>
                            <View style={styles.mealInfo}>
                              <Text style={styles.mealName}>{meal.name}</Text>
                            </View>
                          </View>

                          <View style={styles.macrosRow}>
                            <View style={styles.macroTag}>
                              <Text style={styles.macroTagLabel}>Cal:</Text>
                              <Text style={styles.macroTagValue}>
                                {meal.calories}
                              </Text>
                            </View>
                            <View style={styles.macroTag}>
                              <Text style={styles.macroTagLabel}>P:</Text>
                              <Text style={styles.macroTagValue}>
                                {meal.protein}g
                              </Text>
                            </View>
                            <View style={styles.macroTag}>
                              <Text style={styles.macroTagLabel}>C:</Text>
                              <Text style={styles.macroTagValue}>
                                {meal.carbs}g
                              </Text>
                            </View>
                            <View style={styles.macroTag}>
                              <Text style={styles.macroTagLabel}>F:</Text>
                              <Text style={styles.macroTagValue}>
                                {meal.fats}g
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
  header: {
    backgroundColor: "#5B7FFF",
    padding: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 4,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
    minHeight: 300,
  },
  emptyCard: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(91,127,255,0.25)",
    backgroundColor: palette.surface,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    ...shadows.card,
  },
  emptyIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(91,127,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(91,127,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyIcon: {
    fontSize: 34,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  emptyText: {
    fontSize: 15,
    color: palette.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  assignedPlansBox: {
    marginTop: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    padding: spacing.md,
    width: "100%",
    maxWidth: 320,
  },
  assignedPlansTitle: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  assignedPlanItem: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  macrosSummary: {
    backgroundColor: palette.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: 12,
  },
  totalsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  totalCard: {
    flex: 1,
    backgroundColor: "rgba(91, 127, 255, 0.1)",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderTopWidth: 3,
    borderTopColor: "#5B7FFF",
  },
  totalLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#5B7FFF",
  },
  totalUnit: {
    fontSize: 11,
    color: palette.textTertiary,
    marginTop: 2,
  },
  emptyStateHint: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  mealsContainer: {
    padding: 16,
  },
  mealsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  mealSectionCard: {
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 12,
  },
  mealSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  mealSectionTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  mealSectionCount: {
    minWidth: 28,
    textAlign: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    color: "#DCE2FF",
    backgroundColor: "rgba(91,127,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(91,127,255,0.4)",
    fontSize: 12,
    fontWeight: "700",
  },
  mealCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  mealIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealDescription: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 2,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.textPrimary,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  mealCalories: {
    alignItems: "flex-end",
    marginRight: 8,
  },
  calories: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5B7FFF",
  },
  caloriesUnit: {
    fontSize: 11,
    color: palette.textSecondary,
  },
  expandIcon: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  macrosRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  macroTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(91, 127, 255, 0.1)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  macroTagLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: palette.textSecondary,
  },
  macroTagValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5B7FFF",
  },
  mealDetails: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 12,
  },
  macrosList: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  macroDetailItem: {
    flex: 1,
    backgroundColor: "rgba(91, 127, 255, 0.1)",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  macroDetailLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    marginBottom: 4,
  },
  macroDetailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5B7FFF",
  },
  descriptionSection: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "rgba(91, 127, 255, 0.08)",
    borderRadius: 8,
  },
  descriptionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.textSecondary,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: palette.textPrimary,
    lineHeight: 20,
  },
  ingredientsSection: {
    padding: 12,
    backgroundColor: "rgba(91, 127, 255, 0.08)",
    borderRadius: 8,
  },
  ingredientsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.textSecondary,
    marginBottom: 6,
  },
  ingredientsText: {
    fontSize: 14,
    color: palette.textPrimary,
    lineHeight: 20,
  },
});

export default DietScreen;
