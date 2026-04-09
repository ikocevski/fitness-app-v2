import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
  SafeAreaView,
  Switch,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../config/supabase";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import Papa from "papaparse";

interface Meal {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string;
  meal_type?: string;
  image_url?: string;
  created_at: string;
  assigned_to_client_id?: string;
}

interface DietPlan {
  id: string;
  user_id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface DietPlanMeal {
  id: string;
  diet_plan_id: string;
  diet_meal_id: string;
  meal_type: string;
  display_order: number;
  is_required: boolean;
  meal?: Meal;
}

interface MealSwap {
  id: string;
  original_meal_id: string;
  alternative_meal_id: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

const ManageDietsScreen = () => {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    ingredients: "",
    meal_type: "",
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"meals" | "plans">("meals");
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DietPlan | null>(null);
  const [planMeals, setPlanMeals] = useState<DietPlanMeal[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPlanMealsModal, setShowPlanMealsModal] = useState(false);
  const [showAddMealToPlanModal, setShowAddMealToPlanModal] = useState(false);
  const [showPlanAssignModal, setShowPlanAssignModal] = useState(false);
  const [selectedPlanClient, setSelectedPlanClient] = useState<Client | null>(
    null,
  );
  const [planForm, setPlanForm] = useState({
    name: "",
    meal_type: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    description: "",
  });
  const [planMealForm, setPlanMealForm] = useState({
    mealId: "",
    meal_type: "",
    display_order: "",
    is_required: true,
  });
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapMeal, setSwapMeal] = useState<Meal | null>(null);
  const [mealSwaps, setMealSwaps] = useState<Meal[]>([]);

  useEffect(() => {
    fetchMeals();
    fetchClients();
    fetchPlans();
  }, []);

  const fetchClients = async () => {
    try {
      const scoped = await supabase
        .from("coach_clients")
        .select("client_id")
        .eq("coach_id", user?.id);

      if (scoped.error) throw scoped.error;
      const clientIds = (scoped.data || []).map((cc) => cc.client_id);

      const detailsQuery = clientIds.length
        ? supabase.from("users").select("id, email, name").in("id", clientIds)
        : supabase.from("users").select("id, email, name").eq("role", "client");

      const details = await detailsQuery;
      if (details.error) throw details.error;
      const mappedClients = (details.data || []).map((item: any) => ({
        id: item.id,
        email: item.email || "Unknown",
        name: item.name || "Client",
      }));
      setClients(mappedClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
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

  const openPlanClientSelector = async () => {
    await fetchClients();
    if ((clients || []).length === 0) {
      Alert.alert(
        "No clients available",
        "Link clients to this coach first, or check RLS policies.",
      );
    }
    setShowPlanAssignModal(true);
  };

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("diet_meals")
        .select("*")
        .eq("coach_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMeals(data || []);
    } catch (error) {
      console.error("Error fetching meals:", error);
      Alert.alert("Error", "Failed to load meals");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("diet_plans")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      Alert.alert("Error", "Failed to load diet plans");
    } finally {
      setLoading(false);
    }
  };

  const openCreatePlanModal = () => {
    setSelectedPlan(null);
    setSelectedPlanClient(null);
    setPlanForm({
      name: "",
      meal_type: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      description: "",
    });
    setShowPlanModal(true);
  };

  const openEditPlanModal = (plan: DietPlan) => {
    setSelectedPlan(plan);
    const assigned = clients.find((c) => c.id === plan.user_id) || null;
    setSelectedPlanClient(assigned);
    setPlanForm({
      name: plan.name,
      meal_type: plan.meal_type,
      calories: plan.calories.toString(),
      protein: plan.protein?.toString() || "",
      carbs: plan.carbs?.toString() || "",
      fats: plan.fats?.toString() || "",
      description: plan.description || "",
    });
    setShowPlanModal(true);
  };

  const savePlan = async () => {
    if (!user?.id) return;
    if (!planForm.name || !planForm.meal_type || !planForm.calories) {
      Alert.alert("Error", "Please fill in name, meal type, and calories");
      return;
    }
    if (!selectedPlanClient) {
      Alert.alert(
        "No client selected",
        "This plan will be saved without a client assignment. You can assign it later.",
      );
    }

    try {
      setLoading(true);
      const payload = {
        name: planForm.name,
        meal_type: planForm.meal_type,
        calories: parseInt(planForm.calories),
        protein: planForm.protein ? parseFloat(planForm.protein) : null,
        carbs: planForm.carbs ? parseFloat(planForm.carbs) : null,
        fats: planForm.fats ? parseFloat(planForm.fats) : null,
        description: planForm.description || null,
        user_id: selectedPlanClient?.id || user.id,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (selectedPlan) {
        const { error } = await supabase
          .from("diet_plans")
          .update(payload)
          .eq("id", selectedPlan.id);
        if (error) throw error;
        Alert.alert("Success", "Plan updated successfully");
      } else {
        const { error } = await supabase.from("diet_plans").insert([payload]);
        if (error) throw error;
        Alert.alert("Success", "Plan created successfully");
      }

      setShowPlanModal(false);
      fetchPlans();
    } catch (error: any) {
      console.error("Error saving plan:", error);
      Alert.alert("Error", error.message || "Failed to save plan");
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (planId: string) => {
    Alert.alert("Delete Plan", "Are you sure you want to delete this plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("diet_plans")
              .delete()
              .eq("id", planId);
            if (error) throw error;
            Alert.alert("Success", "Plan deleted successfully");
            fetchPlans();
          } catch (error) {
            Alert.alert("Error", "Failed to delete plan");
          }
        },
      },
    ]);
  };

  const assignPlanToClient = async (planId: string, clientId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("diet_plans")
        .update({ user_id: clientId, updated_at: new Date().toISOString() })
        .eq("id", planId);
      if (error) throw error;

      const { data: linkedPlanMeals, error: linkedPlanMealsError } =
        await supabase
          .from("diet_plan_meals")
          .select("diet_meal_id")
          .eq("diet_plan_id", planId);

      if (linkedPlanMealsError) throw linkedPlanMealsError;

      const linkedMealIds = Array.from(
        new Set((linkedPlanMeals || []).map((item) => item.diet_meal_id)),
      );

      if (linkedMealIds.length > 0) {
        const { error: updateMealsError } = await supabase
          .from("diet_meals")
          .update({ assigned_to_client_id: clientId })
          .in("id", linkedMealIds);

        if (updateMealsError) throw updateMealsError;
      }

      Alert.alert("Success", "Plan assigned to client");
      fetchPlans();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to assign plan");
    } finally {
      setLoading(false);
    }
  };

  const openPlanMeals = async (plan: DietPlan) => {
    console.log("[openPlanMeals] Opening plan meals for plan:", plan.name);
    setSelectedPlan(plan);
    await fetchPlanMeals(plan.id);
    setShowPlanMealsModal(true);
  };

  const fetchPlanMeals = async (planId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("diet_plan_meals")
        .select("*")
        .eq("diet_plan_id", planId)
        .order("display_order", { ascending: true });
      if (error) throw error;

      const planMealRows: DietPlanMeal[] = data || [];
      const mealIds = planMealRows.map((pm) => pm.diet_meal_id);
      const mealsResp = mealIds.length
        ? await supabase.from("diet_meals").select("*").in("id", mealIds)
        : { data: [], error: null };
      if ((mealsResp as any).error) throw (mealsResp as any).error;

      const mealsById = (mealsResp as any).data?.reduce(
        (acc: Record<string, Meal>, meal: Meal) => {
          acc[meal.id] = meal;
          return acc;
        },
        {},
      );

      const merged = planMealRows.map((pm) => ({
        ...pm,
        meal: mealsById?.[pm.diet_meal_id],
      }));
      setPlanMeals(merged);
    } catch (error) {
      console.error("Error fetching plan meals", error);
      Alert.alert("Error", "Failed to load plan meals");
    } finally {
      setLoading(false);
    }
  };

  const addMealToPlan = async () => {
    if (!selectedPlan) return;
    if (!planMealForm.mealId || !planMealForm.meal_type) {
      Alert.alert("Error", "Select a meal and meal type");
      return;
    }

    try {
      setLoading(true);
      const mealType = planMealForm.meal_type.trim();
      const currentOrders = planMeals
        .filter((pm) => pm.meal_type === mealType)
        .map((pm) => pm.display_order);
      const maxOrder = currentOrders.length ? Math.max(...currentOrders) : -1;
      const rawOrder = planMealForm.display_order
        ? parseInt(planMealForm.display_order)
        : NaN;
      let desiredOrder = Number.isNaN(rawOrder) ? maxOrder + 1 : rawOrder;

      if (currentOrders.includes(desiredOrder)) {
        desiredOrder = maxOrder + 1;
        Alert.alert(
          "Order adjusted",
          `Order already used for ${mealType}. Using next order: ${desiredOrder}.`,
        );
      }

      const payload = {
        diet_plan_id: selectedPlan.id,
        diet_meal_id: planMealForm.mealId,
        meal_type: mealType,
        display_order: desiredOrder,
        is_required: planMealForm.is_required,
      };
      const { error } = await supabase
        .from("diet_plan_meals")
        .insert([payload]);
      if (error) throw error;
      setShowAddMealToPlanModal(false);
      setPlanMealForm({
        mealId: "",
        meal_type: "",
        display_order: "",
        is_required: true,
      });
      await fetchPlanMeals(selectedPlan.id);
      // Reopen parent modal after successful add
      setTimeout(() => setShowPlanMealsModal(true), 100);
    } catch (error: any) {
      console.error("Error adding meal to plan", error);
      if (error?.code === "23505") {
        Alert.alert(
          "Duplicate order",
          "That order is already used for this meal type. Please try another order.",
        );
      } else {
        Alert.alert("Error", error.message || "Failed to add meal to plan");
      }
    } finally {
      setLoading(false);
    }
  };

  const removeMealFromPlan = async (planMealId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("diet_plan_meals")
        .delete()
        .eq("id", planMealId);
      if (error) throw error;
      if (selectedPlan) await fetchPlanMeals(selectedPlan.id);
    } catch (error) {
      Alert.alert("Error", "Failed to remove meal from plan");
    } finally {
      setLoading(false);
    }
  };

  const openSwapManager = async (meal: Meal) => {
    setSwapMeal(meal);
    await fetchMealSwaps(meal.id);
    setShowSwapModal(true);
  };

  const fetchMealSwaps = async (mealId: string) => {
    try {
      const { data, error } = await supabase
        .from("meal_swaps")
        .select("alternative_meal_id")
        .eq("original_meal_id", mealId);
      if (error) throw error;
      const altIds = (data || []).map((r: any) => r.alternative_meal_id);
      if (!altIds.length) {
        setMealSwaps([]);
        return;
      }
      const { data: altMeals, error: altError } = await supabase
        .from("diet_meals")
        .select("*")
        .in("id", altIds);
      if (altError) throw altError;
      setMealSwaps(altMeals || []);
    } catch (error) {
      console.error("Error fetching meal swaps", error);
      Alert.alert("Error", "Failed to load meal swaps");
    }
  };

  const addMealSwap = async (alternativeMealId: string) => {
    if (!swapMeal) return;
    try {
      const { error } = await supabase.from("meal_swaps").insert([
        {
          original_meal_id: swapMeal.id,
          alternative_meal_id: alternativeMealId,
        },
      ]);
      if (error) throw error;
      await fetchMealSwaps(swapMeal.id);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add swap meal");
    }
  };

  const removeMealSwap = async (alternativeMealId: string) => {
    if (!swapMeal) return;
    try {
      const { error } = await supabase
        .from("meal_swaps")
        .delete()
        .eq("original_meal_id", swapMeal.id)
        .eq("alternative_meal_id", alternativeMealId);
      if (error) throw error;
      await fetchMealSwaps(swapMeal.id);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to remove swap");
    }
  };

  const importMealsFromCsv = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        setLoading(false);
        return;
      }

      const file = result.assets[0];
      const csvText = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors?.length) {
        Alert.alert("CSV Error", parsed.errors[0].message || "Invalid CSV");
        return;
      }

      const rows = (parsed.data as any[]) || [];
      const payload = rows
        .filter((r) => r.name && r.calories && r.protein && r.carbs && r.fats)
        .map((r) => ({
          name: String(r.name).trim(),
          description: r.description ? String(r.description) : null,
          calories: parseInt(r.calories),
          protein: parseFloat(r.protein),
          carbs: parseFloat(r.carbs),
          fats: parseFloat(r.fats),
          ingredients: r.ingredients ? String(r.ingredients) : null,
          image_url: r.image_url ? String(r.image_url) : null,
          coach_id: user.id,
          assigned_to_client_id: r.assigned_to_client_id || null,
        }));

      if (!payload.length) {
        Alert.alert("CSV Error", "No valid rows found in CSV file");
        return;
      }

      const { error } = await supabase.from("diet_meals").insert(payload);
      if (error) throw error;
      Alert.alert("Success", `Imported ${payload.length} meals`);
      fetchMeals();
    } catch (error: any) {
      console.error("CSV import error", error);
      Alert.alert("Error", error.message || "Failed to import meals");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission needed", "Please enable photo library access");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        await uploadImageToSupabase(imageUri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImageToSupabase = async (imageUri: string) => {
    try {
      setLoading(true);
      const fileName = `meal_${Date.now()}.jpg`;
      const fileData = await FileSystem.readAsStringAsync(imageUri, {
        encoding: "base64",
      });

      const { data, error } = await supabase.storage
        .from("meal-images")
        .upload(fileName, decode(fileData), {
          contentType: "image/jpeg",
        });

      if (error) throw error;

      // Get the public URL
      const { data: publicData } = supabase.storage
        .from("meal-images")
        .getPublicUrl(fileName);

      setSelectedImage(publicData.publicUrl);
      Alert.alert("Success", "Image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      // Fallback to local URI if storage fails
      setSelectedImage(imageUri);
      Alert.alert("Info", "Using local image (storage not configured)");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to decode base64
  const decode = (str: string) => {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return bytes;
  };

  const openCreateModal = () => {
    setEditingMeal(null);
    setSelectedClient(null);
    setFormData({
      name: "",
      description: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      ingredients: "",
      meal_type: "",
    });
    setSelectedImage(null);
    setShowModal(true);
  };

  const openEditModal = (meal: Meal) => {
    setEditingMeal(meal);
    // Set the selected client if meal has one assigned
    if (meal.assigned_to_client_id) {
      const assignedClient = clients.find(
        (c) => c.id === meal.assigned_to_client_id,
      );
      setSelectedClient(assignedClient || null);
    } else {
      setSelectedClient(null);
    }
    setFormData({
      name: meal.name,
      description: meal.description,
      calories: meal.calories.toString(),
      protein: meal.protein.toString(),
      carbs: meal.carbs.toString(),
      fats: meal.fats.toString(),
      ingredients: meal.ingredients,
      meal_type: meal.meal_type || "",
    });
    setSelectedImage(meal.image_url || null);
    setShowModal(true);
  };

  const saveMeal = async () => {
    if (
      !formData.name ||
      !formData.calories ||
      !formData.protein ||
      !formData.carbs ||
      !formData.fats
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      const mealData = {
        name: formData.name,
        description: formData.description,
        calories: parseInt(formData.calories),
        protein: parseFloat(formData.protein),
        carbs: parseFloat(formData.carbs),
        fats: parseFloat(formData.fats),
        ingredients: formData.ingredients,
        meal_type: formData.meal_type || null,
        image_url: selectedImage,
        coach_id: user?.id,
        assigned_to_client_id: selectedClient?.id || null,
      };

      console.log("[saveMeal] Saving meal with data:", mealData);
      console.log("[saveMeal] Selected client:", selectedClient);

      if (editingMeal) {
        const { error } = await supabase
          .from("diet_meals")
          .update(mealData)
          .eq("id", editingMeal.id);

        if (error) throw error;
        Alert.alert("Success", "Meal updated successfully!");
      } else {
        const { error } = await supabase.from("diet_meals").insert([mealData]);

        if (error) throw error;
        Alert.alert("Success", "Meal created successfully!");
      }

      setShowModal(false);
      fetchMeals();
    } catch (error: any) {
      console.error("Error saving meal:", error);
      Alert.alert("Error", error.message || "Failed to save meal");
    } finally {
      setLoading(false);
    }
  };

  const deleteMeal = async (mealId: string) => {
    Alert.alert("Delete Meal", "Are you sure you want to delete this meal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("diet_meals")
              .delete()
              .eq("id", mealId);

            if (error) throw error;
            Alert.alert("Success", "Meal deleted successfully!");
            fetchMeals();
          } catch (error) {
            Alert.alert("Error", "Failed to delete meal");
          }
        },
      },
    ]);
  };

  const assignMealToClient = async (
    mealId: string,
    clientId: string | null,
  ) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("diet_meals")
        .update({ assigned_to_client_id: clientId })
        .eq("id", mealId);

      if (error) throw error;
      Alert.alert(
        "Success",
        clientId
          ? "Meal assigned to client!"
          : "Meal marked as unassigned for all clients",
      );
      fetchMeals();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to assign meal");
    } finally {
      setLoading(false);
    }
  };

  const renderMealCard = (meal: Meal) => (
    <View key={meal.id} style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View style={styles.mealInfo}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealDescription} numberOfLines={2}>
            {meal.description}
          </Text>
          {!meal.assigned_to_client_id ? (
            <Text
              style={[
                styles.mealDescription,
                { color: "#FF9500", marginTop: 4 },
              ]}
            >
              ⚠️ Not assigned
            </Text>
          ) : null}
        </View>
        {meal.image_url && (
          <Image source={{ uri: meal.image_url }} style={styles.mealImage} />
        )}
      </View>

      <View style={styles.macrosContainer}>
        <View style={styles.macroBox}>
          <Text style={styles.macroLabel}>Calories</Text>
          <Text style={styles.macroValue}>{meal.calories}</Text>
          <Text style={styles.macroUnit}>kcal</Text>
        </View>
        <View style={styles.macroBox}>
          <Text style={styles.macroLabel}>Protein</Text>
          <Text style={styles.macroValue}>{meal.protein}g</Text>
        </View>
        <View style={styles.macroBox}>
          <Text style={styles.macroLabel}>Carbs</Text>
          <Text style={styles.macroValue}>{meal.carbs}g</Text>
        </View>
        <View style={styles.macroBox}>
          <Text style={styles.macroLabel}>Fats</Text>
          <Text style={styles.macroValue}>{meal.fats}g</Text>
        </View>
      </View>

      {meal.ingredients && (
        <View style={styles.ingredientsSection}>
          <Text style={styles.ingredientsTitle}>Ingredients:</Text>
          <Text style={styles.ingredientsText}>{meal.ingredients}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditModal(meal)}
        >
          <Text style={styles.actionBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.assignBtn]}
          onPress={() => {
            setEditingMeal(meal);
            setShowClientSelector(true);
          }}
        >
          <Text style={styles.actionBtnText}>
            {meal.assigned_to_client_id ? "✓ Assigned" : "➕ Assign"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.swapBtn]}
          onPress={() => openSwapManager(meal)}
        >
          <Text style={styles.actionBtnText}>🔁 Swaps</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => deleteMeal(meal.id)}
        >
          <Text style={styles.actionBtnText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlanCard = (plan: DietPlan) => {
    const client = clients.find((c) => c.id === plan.user_id);
    return (
      <View key={plan.id} style={styles.planCard}>
        <View style={styles.planHeader}>
          <View style={styles.planInfo}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planMeta}>
              {plan.meal_type} • {plan.calories} kcal
            </Text>
            <Text style={styles.planMeta}>👤 {client?.name || "Client"}</Text>
          </View>
        </View>

        {plan.description ? (
          <Text style={styles.planDescription} numberOfLines={2}>
            {plan.description}
          </Text>
        ) : null}

        <View style={styles.macrosContainer}>
          <View style={styles.macroBox}>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroValue}>{plan.protein || 0}g</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroValue}>{plan.carbs || 0}g</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroLabel}>Fats</Text>
            <Text style={styles.macroValue}>{plan.fats || 0}g</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.planMealsBtn]}
            onPress={() => openPlanMeals(plan)}
          >
            <Text style={styles.actionBtnText}>🍽️ Meals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.assignBtn]}
            onPress={() => {
              setSelectedPlan(plan);
              setShowPlanAssignModal(true);
            }}
          >
            <Text style={styles.actionBtnText}>👤 Assign</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => openEditPlanModal(plan)}
          >
            <Text style={styles.actionBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => deletePlan(plan.id)}
          >
            <Text style={styles.actionBtnText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>🥗 Manage Diets</Text>
          <Text style={styles.subtitle}>
            Build a meal library and assign plans to clients
          </Text>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                viewMode === "meals" && styles.tabButtonActive,
              ]}
              onPress={() => setViewMode("meals")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  viewMode === "meals" && styles.tabButtonTextActive,
                ]}
              >
                Meals
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                viewMode === "plans" && styles.tabButtonActive,
              ]}
              onPress={() => setViewMode("plans")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  viewMode === "plans" && styles.tabButtonTextActive,
                ]}
              >
                Plans
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {viewMode === "meals" ? (
            <>
              <View style={styles.rowButtons}>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={openCreateModal}
                >
                  <Text style={styles.createButtonIcon}>➕</Text>
                  <Text style={styles.createButtonText}>Create Meal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createButton, styles.secondaryButton]}
                  onPress={importMealsFromCsv}
                >
                  <Text style={styles.createButtonIcon}>⬆️</Text>
                  <Text style={styles.createButtonText}>Import CSV</Text>
                </TouchableOpacity>
              </View>

              {loading && meals.length === 0 ? (
                <ActivityIndicator size="large" color="#FF6B35" />
              ) : meals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>📭</Text>
                  <Text style={styles.emptyStateText}>
                    No meals created yet
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Tap the button above to create your first meal
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.sectionTitle}>
                    Your Meals ({meals.length})
                  </Text>
                  {meals.map((meal) => renderMealCard(meal))}
                </View>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.createButton}
                onPress={openCreatePlanModal}
              >
                <Text style={styles.createButtonIcon}>➕</Text>
                <Text style={styles.createButtonText}>Create Meal Plan</Text>
              </TouchableOpacity>

              {loading && plans.length === 0 ? (
                <ActivityIndicator size="large" color="#FF6B35" />
              ) : plans.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>📭</Text>
                  <Text style={styles.emptyStateText}>No plans created</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Create a plan and add meals to it
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.sectionTitle}>
                    Your Plans ({plans.length})
                  </Text>
                  {plans.map((plan) => renderPlanCard(plan))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Create/Edit Modal */}
        <Modal visible={showModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {editingMeal ? "Edit Meal" : "Create New Meal"}
                </Text>
                <View style={{ width: 30 }} />
              </View>

              <View style={styles.form}>
                {/* Meal Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Meal Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Grilled Chicken with Rice"
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                  />
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add a description of the meal"
                    value={formData.description}
                    onChangeText={(text) =>
                      setFormData({ ...formData, description: text })
                    }
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Image Upload */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Meal Image</Text>
                  <TouchableOpacity
                    style={styles.imageButton}
                    onPress={pickImage}
                  >
                    {selectedImage ? (
                      <Image
                        source={{ uri: selectedImage }}
                        style={styles.previewImage}
                      />
                    ) : (
                      <>
                        <Text style={styles.imageButtonIcon}>📸</Text>
                        <Text style={styles.imageButtonText}>
                          Pick or take a photo
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Macros */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Macronutrients</Text>
                  <View style={styles.macrosGrid}>
                    <View style={styles.macroInput}>
                      <Text style={styles.macroLabel}>Calories *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        keyboardType="number-pad"
                        value={formData.calories}
                        onChangeText={(text) =>
                          setFormData({ ...formData, calories: text })
                        }
                      />
                    </View>
                    <View style={styles.macroInput}>
                      <Text style={styles.macroLabel}>Protein (g) *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={formData.protein}
                        onChangeText={(text) =>
                          setFormData({ ...formData, protein: text })
                        }
                      />
                    </View>
                    <View style={styles.macroInput}>
                      <Text style={styles.macroLabel}>Carbs (g) *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={formData.carbs}
                        onChangeText={(text) =>
                          setFormData({ ...formData, carbs: text })
                        }
                      />
                    </View>
                    <View style={styles.macroInput}>
                      <Text style={styles.macroLabel}>Fats (g) *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={formData.fats}
                        onChangeText={(text) =>
                          setFormData({ ...formData, fats: text })
                        }
                      />
                    </View>
                  </View>
                </View>

                {/* Ingredients */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Ingredients</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="List ingredients separated by commas or newlines"
                    value={formData.ingredients}
                    onChangeText={(text) =>
                      setFormData({ ...formData, ingredients: text })
                    }
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Assign to Client */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Assign to Client (optional)</Text>
                  {clients.length === 0 ? (
                    <Text style={styles.emptyStateSubtext}>
                      No clients available. Meal will be unassigned.
                    </Text>
                  ) : (
                    <>
                      {clients.map((client) => (
                        <TouchableOpacity
                          key={client.id}
                          style={[
                            styles.selectOption,
                            selectedClient?.id === client.id &&
                              styles.selectOptionActive,
                          ]}
                          onPress={() => setSelectedClient(client)}
                        >
                          <Text style={styles.selectOptionText}>
                            {selectedClient?.id === client.id ? "✓ " : ""}
                            {client.name} ({client.email})
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {selectedClient && (
                        <TouchableOpacity
                          onPress={() => setSelectedClient(null)}
                          style={styles.clearClientButton}
                        >
                          <Text style={styles.clearClientText}>
                            ✕ Clear selection
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>

                {/* Buttons */}
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={saveMeal}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? "Saving..." : "Save Meal"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Client Selector Modal */}
        <Modal visible={showClientSelector} transparent animationType="fade">
          <View style={styles.selectorOverlay}>
            <View style={styles.selectorModal}>
              <View style={styles.selectorHeader}>
                <Text style={styles.selectorTitle}>
                  {editingMeal ? "Assign Meal to Client" : "Select a Client"}
                </Text>
                <TouchableOpacity onPress={() => setShowClientSelector(false)}>
                  <Text style={styles.closeSelectorButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={clients}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.clientOption,
                      selectedClient?.id === item.id &&
                        styles.clientOptionSelected,
                    ]}
                    onPress={() => {
                      if (editingMeal) {
                        assignMealToClient(editingMeal.id, item.id);
                      } else {
                        setSelectedClient(item);
                      }
                      setShowClientSelector(false);
                    }}
                  >
                    <Text style={styles.clientOptionText}>👤 {item.name}</Text>
                    <Text style={styles.clientOptionEmail}>{item.email}</Text>
                    {selectedClient?.id === item.id && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.noClients}>
                    <Text style={styles.noClientsText}>
                      No clients added yet. Add clients first!
                    </Text>
                  </View>
                }
              />
              {editingMeal && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: "#E0E0E0",
                    padding: 16,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      assignMealToClient(editingMeal.id, null);
                      setShowClientSelector(false);
                    }}
                    style={{
                      padding: 12,
                      backgroundColor: "#F8F9FA",
                      borderRadius: 8,
                    }}
                  >
                    <Text style={styles.clientOptionText}>
                      Unassign (available to all)
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Plan Create/Edit Modal */}
        <Modal visible={showPlanModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {selectedPlan ? "Edit Plan" : "Create Meal Plan"}
                </Text>
                <View style={{ width: 30 }} />
              </View>

              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Plan Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Fat Loss Plan"
                    value={planForm.name}
                    onChangeText={(text) =>
                      setPlanForm({ ...planForm, name: text })
                    }
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Meal Type *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., standard"
                    value={planForm.meal_type}
                    onChangeText={(text) =>
                      setPlanForm({ ...planForm, meal_type: text })
                    }
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Calories *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="number-pad"
                    value={planForm.calories}
                    onChangeText={(text) =>
                      setPlanForm({ ...planForm, calories: text })
                    }
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Macros</Text>
                  <View style={styles.macrosGrid}>
                    <View style={styles.macroInput}>
                      <Text style={styles.macroLabel}>Protein (g)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={planForm.protein}
                        onChangeText={(text) =>
                          setPlanForm({ ...planForm, protein: text })
                        }
                      />
                    </View>
                    <View style={styles.macroInput}>
                      <Text style={styles.macroLabel}>Carbs (g)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={planForm.carbs}
                        onChangeText={(text) =>
                          setPlanForm({ ...planForm, carbs: text })
                        }
                      />
                    </View>
                    <View style={styles.macroInput}>
                      <Text style={styles.macroLabel}>Fats (g)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={planForm.fats}
                        onChangeText={(text) =>
                          setPlanForm({ ...planForm, fats: text })
                        }
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Plan notes or description"
                    value={planForm.description}
                    onChangeText={(text) =>
                      setPlanForm({ ...planForm, description: text })
                    }
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Assign Client (optional)</Text>
                  {clients.length === 0 ? (
                    <Text style={styles.emptyStateSubtext}>
                      No clients available. Plan will be unassigned.
                    </Text>
                  ) : (
                    <>
                      {clients.map((client) => (
                        <TouchableOpacity
                          key={client.id}
                          style={[
                            styles.selectOption,
                            selectedPlanClient?.id === client.id &&
                              styles.selectOptionActive,
                          ]}
                          onPress={() => setSelectedPlanClient(client)}
                        >
                          <Text style={styles.selectOptionText}>
                            {selectedPlanClient?.id === client.id ? "✓ " : ""}
                            {client.name} ({client.email})
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {selectedPlanClient && (
                        <TouchableOpacity
                          onPress={() => setSelectedPlanClient(null)}
                          style={styles.clearClientButton}
                        >
                          <Text style={styles.clearClientText}>
                            ✕ Clear selection
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>

                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowPlanModal(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={savePlan}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? "Saving..." : "Save Plan"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Plan Meals Modal */}
        <Modal visible={showPlanMealsModal} transparent animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
            <View
              style={[styles.modalContent, { marginTop: 40, maxHeight: "90%" }]}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPlanMealsModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {selectedPlan?.name || "Plan Meals"}
                </Text>
                <View style={{ width: 30 }} />
              </View>

              <TouchableOpacity
                style={styles.createButton}
                onPress={() => {
                  console.log("[Add Meal] Button pressed, opening modal");
                  console.log("[Add Meal] Current meals count:", meals.length);
                  setShowPlanMealsModal(false); // Close parent modal first
                  setTimeout(() => setShowAddMealToPlanModal(true), 100); // Then open child modal
                }}
              >
                <Text style={styles.createButtonIcon}>➕</Text>
                <Text style={styles.createButtonText}>Add Meal</Text>
              </TouchableOpacity>

              <ScrollView>
                {planMeals.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>🍽️</Text>
                    <Text style={styles.emptyStateText}>
                      No meals in this plan
                    </Text>
                  </View>
                ) : (
                  planMeals.map((pm) => (
                    <View key={pm.id} style={styles.planMealRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planMealName}>
                          {pm.meal?.name || "Meal"}
                        </Text>
                        <Text style={styles.planMealMeta}>
                          {pm.meal_type} • Order {pm.display_order}
                        </Text>
                        <Text style={styles.planMealMeta}>
                          {pm.is_required ? "Required" : "Optional"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => removeMealFromPlan(pm.id)}
                      >
                        <Text style={styles.actionBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Add Meal to Plan Modal */}
        <Modal
          visible={showAddMealToPlanModal}
          transparent
          animationType="slide"
          onShow={() => console.log("[Add Meal Modal] Now visible")}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)" }}>
            <ScrollView
              style={[styles.modalContent, { marginTop: 60, maxHeight: "85%" }]}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddMealToPlanModal(false);
                    setTimeout(() => setShowPlanMealsModal(true), 100); // Reopen parent modal
                  }}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Add Meal to Plan</Text>
                <View style={{ width: 30 }} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Meal *</Text>
                {meals.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No meals available
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                      Create meals first in the Meals tab
                    </Text>
                  </View>
                ) : (
                  meals.map((meal) => (
                    <TouchableOpacity
                      key={meal.id}
                      style={[
                        styles.selectOption,
                        planMealForm.mealId === meal.id &&
                          styles.selectOptionActive,
                      ]}
                      onPress={() => {
                        setPlanMealForm({
                          ...planMealForm,
                          mealId: meal.id,
                          meal_type: meal.meal_type || planMealForm.meal_type,
                        });
                      }}
                    >
                      <Text style={styles.selectOptionText}>{meal.name}</Text>
                      {meal.meal_type && (
                        <Text style={styles.selectOptionSubtext}>
                          {meal.meal_type}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Meal Type *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="breakfast / lunch / dinner / snack"
                  value={planMealForm.meal_type}
                  onChangeText={(text) =>
                    setPlanMealForm({ ...planMealForm, meal_type: text })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Display Order</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="number-pad"
                  value={planMealForm.display_order}
                  onChangeText={(text) =>
                    setPlanMealForm({ ...planMealForm, display_order: text })
                  }
                />
              </View>

              <View style={styles.formGroupRow}>
                <Text style={styles.label}>Required</Text>
                <Switch
                  value={planMealForm.is_required}
                  onValueChange={(value) =>
                    setPlanMealForm({ ...planMealForm, is_required: value })
                  }
                />
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddMealToPlanModal(false);
                    setTimeout(() => setShowPlanMealsModal(true), 100); // Reopen parent modal
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={addMealToPlan}
                >
                  <Text style={styles.buttonText}>Add Meal</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Swap Meals Modal */}
        <Modal visible={showSwapModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowSwapModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  Swap Options for {swapMeal?.name || "Meal"}
                </Text>
                <View style={{ width: 30 }} />
              </View>

              <Text style={styles.sectionTitle}>Approved Swaps</Text>
              {mealSwaps.length === 0 ? (
                <Text style={styles.emptyStateSubtext}>
                  No swap meals added yet
                </Text>
              ) : (
                mealSwaps.map((m) => (
                  <View key={m.id} style={styles.swapRow}>
                    <Text style={styles.swapMealName}>{m.name}</Text>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => removeMealSwap(m.id)}
                    >
                      <Text style={styles.actionBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <Text style={styles.sectionTitle}>Add Swap Meal</Text>
              <ScrollView style={{ maxHeight: 200 }}>
                {meals
                  .filter((m) => m.id !== swapMeal?.id)
                  .map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={styles.selectOption}
                      onPress={() => addMealSwap(m.id)}
                    >
                      <Text style={styles.selectOptionText}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Plan Assign Modal */}
        <Modal visible={showPlanAssignModal} transparent animationType="fade">
          <View style={styles.selectorOverlay}>
            <View style={styles.selectorModal}>
              <View style={styles.selectorHeader}>
                <Text style={styles.selectorTitle}>Assign Plan to Client</Text>
                <TouchableOpacity onPress={() => setShowPlanAssignModal(false)}>
                  <Text style={styles.closeSelectorButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={clients}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.clientOption,
                      selectedPlanClient?.id === item.id &&
                        styles.clientOptionSelected,
                    ]}
                    onPress={() => {
                      if (selectedPlan) {
                        assignPlanToClient(selectedPlan.id, item.id);
                      } else {
                        setSelectedPlanClient(item);
                      }
                      setShowPlanAssignModal(false);
                    }}
                  >
                    <Text style={styles.clientOptionText}>👤 {item.name}</Text>
                    <Text style={styles.clientOptionEmail}>{item.email}</Text>
                    {selectedPlanClient?.id === item.id && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.noClients}>
                    <Text style={styles.noClientsText}>
                      No clients added yet. Add clients first!
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    backgroundColor: "#FF6B35",
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  subtitle: {
    fontSize: 14,
    color: "#FFE5DC",
    marginTop: 6,
  },
  content: {
    padding: 20,
  },
  createButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  createButtonIcon: {
    fontSize: 24,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  mealCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  mealInfo: {
    flex: 1,
    marginRight: 12,
  },
  mealName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  mealDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  mealImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  macrosContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  macroBox: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  macroLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6B35",
  },
  macroUnit: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  ingredientsSection: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  ingredientsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  ingredientsText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  editBtn: {
    backgroundColor: "#4A9EFF",
  },
  assignBtn: {
    backgroundColor: "#FF9500",
  },
  deleteBtn: {
    backgroundColor: "#FF3B30",
  },
  swapBtn: {
    backgroundColor: "#8E44AD",
  },
  planMealsBtn: {
    backgroundColor: "#34C759",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
  },
  tabRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#fff",
  },
  tabButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#FF6B35",
    fontWeight: "700",
  },
  rowButtons: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: "#FF9500",
  },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  planMeta: {
    fontSize: 12,
    color: "#666",
  },
  planDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  planMealRow: {
    backgroundColor: "#f7f7f7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planMealName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
  },
  planMealMeta: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  selectOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    marginBottom: 8,
  },
  selectOptionActive: {
    backgroundColor: "rgba(255,107,53,0.2)",
  },
  selectOptionText: {
    fontSize: 14,
    color: "#333",
  },
  selectOptionSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  formGroupRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  swapRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  swapMealName: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingTop: 40,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "95%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  closeButton: {
    fontSize: 28,
    color: "#333",
    fontWeight: "700",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  form: {
    gap: 16,
  },
  formGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a1a1a",
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    textAlignVertical: "top",
    minHeight: 100,
  },
  imageButton: {
    borderWidth: 2,
    borderColor: "#FF6B35",
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff8f4",
  },
  imageButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: 150,
    borderRadius: 10,
  },
  macrosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  macroInput: {
    flex: 1,
    minWidth: "48%",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#e0e0e0",
  },
  saveButton: {
    backgroundColor: "#FF6B35",
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  clientButton: {
    borderWidth: 1.5,
    borderColor: "#FF6B35",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff8f4",
  },
  clientButtonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  clearClientButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  clearClientText: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "underline",
  },
  selectorOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  selectorModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 24,
  },
  selectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  closeSelectorButton: {
    fontSize: 28,
    color: "#333",
    fontWeight: "700",
  },
  clientOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  clientOptionSelected: {
    backgroundColor: "#fff8f4",
  },
  clientOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  clientOptionEmail: {
    fontSize: 12,
    color: "#999",
    marginRight: 8,
  },
  checkmark: {
    fontSize: 20,
    color: "#FF6B35",
    fontWeight: "700",
  },
  noClients: {
    padding: 24,
    alignItems: "center",
  },
  noClientsText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});

export default ManageDietsScreen;
