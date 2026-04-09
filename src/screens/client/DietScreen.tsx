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
import { palette, radii, spacing, typography, shadows } from "../../theme";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  description?: string;
  ingredients?: string;
  image_url?: string;
}

interface AssignedPlan {
  id: string;
  name: string;
  meal_type?: string;
}

const DietScreen = () => {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [assignedPlans, setAssignedPlans] = useState<AssignedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  useEffect(() => {
    fetchDietPlan();
  }, []);

  const fetchDietPlan = async () => {
    try {
      console.log("[fetchDietPlan] Fetching meals for user ID:", user?.id);
      if (!user?.id) {
        setMeals([]);
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
        .select("id, name, meal_type")
        .eq("user_id", user.id);

      if (planError) {
        console.log("[fetchDietPlan] Plan meals error:", planError);
      }

      const planRows = (assignedPlans || []) as AssignedPlan[];
      setAssignedPlans(planRows);

      const planIds = planRows.map((plan) => plan.id);

      let mealsFromPlans: Meal[] = [];
      if (planIds.length > 0) {
        const { data: planMealsRows, error: planMealsError } = await supabase
          .from("diet_plan_meals")
          .select("diet_meal_id")
          .in("diet_plan_id", planIds);

        if (planMealsError) {
          console.log("[fetchDietPlan] diet_plan_meals error:", planMealsError);
        }

        const mealIds = Array.from(
          new Set((planMealsRows || []).map((row) => row.diet_meal_id)),
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

      // Combine meals from both sources
      let allMeals: Meal[] = directMeals || [];
      allMeals = [...allMeals, ...mealsFromPlans];

      // Remove duplicates by meal ID
      const uniqueMeals = Array.from(
        new Map(allMeals.map((meal) => [meal.id, meal])).values(),
      );

      console.log("[fetchDietPlan] Fetched meals:", {
        direct: directMeals?.length || 0,
        fromPlans: mealsFromPlans.length,
        total: uniqueMeals.length,
      });

      setMeals(uniqueMeals);
    } catch (error) {
      console.error("Error fetching diet meals:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalMacros = () => {
    return meals.reduce(
      (totals, meal) => ({
        calories: totals.calories + (meal.calories || 0),
        protein: totals.protein + (meal.protein || 0),
        carbs: totals.carbs + (meal.carbs || 0),
        fats: totals.fats + (meal.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );
  };

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

        {meals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🥗</Text>
            <Text style={styles.emptyTitle}>
              {assignedPlans.length > 0
                ? "Diet Plan Assigned"
                : "No Diet Plan Yet"}
            </Text>
            <Text style={styles.emptyText}>
              {assignedPlans.length > 0
                ? "Your coach assigned a plan, but no meals are attached yet."
                : "Your coach will create a personalized diet plan for you soon!"}
            </Text>
            {assignedPlans.length > 0 ? (
              <View style={styles.assignedPlansBox}>
                <Text style={styles.assignedPlansTitle}>Assigned Plans</Text>
                {assignedPlans.map((plan) => (
                  <Text key={plan.id} style={styles.assignedPlanItem}>
                    • {plan.name}
                    {plan.meal_type ? ` (${plan.meal_type})` : ""}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <>
            {/* Total Macros Summary */}
            <View style={styles.macrosSummary}>
              <Text style={styles.summaryTitle}>Daily Totals</Text>
              {(() => {
                const totals = calculateTotalMacros();
                return (
                  <View style={styles.totalsGrid}>
                    <View style={styles.totalCard}>
                      <Text style={styles.totalLabel}>Calories</Text>
                      <Text style={styles.totalValue}>{totals.calories}</Text>
                      <Text style={styles.totalUnit}>kcal</Text>
                    </View>
                    <View style={styles.totalCard}>
                      <Text style={styles.totalLabel}>Protein</Text>
                      <Text style={styles.totalValue}>{totals.protein}</Text>
                      <Text style={styles.totalUnit}>g</Text>
                    </View>
                    <View style={styles.totalCard}>
                      <Text style={styles.totalLabel}>Carbs</Text>
                      <Text style={styles.totalValue}>{totals.carbs}</Text>
                      <Text style={styles.totalUnit}>g</Text>
                    </View>
                    <View style={styles.totalCard}>
                      <Text style={styles.totalLabel}>Fats</Text>
                      <Text style={styles.totalValue}>{totals.fats}</Text>
                      <Text style={styles.totalUnit}>g</Text>
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* Meals List */}
            <View style={styles.mealsContainer}>
              <Text style={styles.mealsTitle}>Your Meals</Text>
              {meals.map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.mealCard}
                  onPress={() =>
                    setExpandedMealId(
                      expandedMealId === meal.id ? null : meal.id,
                    )
                  }
                >
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealIcon}>🍽️</Text>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>{meal.name}</Text>
                      {meal.description && (
                        <Text style={styles.mealDescription} numberOfLines={1}>
                          {meal.description}
                        </Text>
                      )}
                    </View>
                    <View style={styles.mealCalories}>
                      <Text style={styles.calories}>{meal.calories}</Text>
                      <Text style={styles.caloriesUnit}>cal</Text>
                    </View>
                    <Text style={styles.expandIcon}>
                      {expandedMealId === meal.id ? "▼" : "▶"}
                    </Text>
                  </View>

                  {/* Macros Summary Row */}
                  <View style={styles.macrosRow}>
                    <View style={styles.macroTag}>
                      <Text style={styles.macroTagLabel}>P:</Text>
                      <Text style={styles.macroTagValue}>{meal.protein}g</Text>
                    </View>
                    <View style={styles.macroTag}>
                      <Text style={styles.macroTagLabel}>C:</Text>
                      <Text style={styles.macroTagValue}>{meal.carbs}g</Text>
                    </View>
                    <View style={styles.macroTag}>
                      <Text style={styles.macroTagLabel}>F:</Text>
                      <Text style={styles.macroTagValue}>{meal.fats}g</Text>
                    </View>
                  </View>

                  {/* Expanded Details */}
                  {expandedMealId === meal.id && (
                    <View style={styles.mealDetails}>
                      <View style={styles.macrosList}>
                        <View style={styles.macroDetailItem}>
                          <Text style={styles.macroDetailLabel}>Protein</Text>
                          <Text style={styles.macroDetailValue}>
                            {meal.protein}g
                          </Text>
                        </View>
                        <View style={styles.macroDetailItem}>
                          <Text style={styles.macroDetailLabel}>Carbs</Text>
                          <Text style={styles.macroDetailValue}>
                            {meal.carbs}g
                          </Text>
                        </View>
                        <View style={styles.macroDetailItem}>
                          <Text style={styles.macroDetailLabel}>Fats</Text>
                          <Text style={styles.macroDetailValue}>
                            {meal.fats}g
                          </Text>
                        </View>
                        <View style={styles.macroDetailItem}>
                          <Text style={styles.macroDetailLabel}>Calories</Text>
                          <Text style={styles.macroDetailValue}>
                            {meal.calories} kcal
                          </Text>
                        </View>
                      </View>

                      {meal.ingredients && (
                        <View style={styles.ingredientsSection}>
                          <Text style={styles.ingredientsTitle}>
                            Ingredients
                          </Text>
                          <Text style={styles.ingredientsText}>
                            {meal.ingredients}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
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
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: palette.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: palette.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  assignedPlansBox: {
    marginTop: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    padding: spacing.md,
    width: "100%",
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
