import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../config/supabase";
import { palette, radii, spacing, typography, shadows } from "../../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WeightModal from "../../components/common/WeightModal";

interface WeightLog {
  id: string;
  weight: number;
  logged_at: string;
}

const ProfileScreen = () => {
  const { user, logout, loading } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [weeklyAverage, setWeeklyAverage] = useState<number | null>(null);
  const [loadingWeights, setLoadingWeights] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLog, setEditingLog] = useState<WeightLog | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [showWeightModal, setShowWeightModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadUnitPreference();
        fetchWeightLogs();
      }
      return () => {};
    }, [user?.id]),
  );

  const loadUnitPreference = async () => {
    try {
      const savedUnit = await AsyncStorage.getItem("weightUnit");
      if (savedUnit === "kg" || savedUnit === "lbs") {
        setUnit(savedUnit);
      }
    } catch (error) {
      console.error("Error loading unit preference:", error);
    }
  };

  const convertWeight = (weightInKg: number) => {
    return unit === "lbs" ? weightInKg * 2.20462 : weightInKg;
  };

  const formatWeight = (weightInKg: number) => {
    return convertWeight(weightInKg).toFixed(1);
  };

  const fetchWeightLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user?.id)
        .order("logged_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      setWeightLogs(data || []);

      // Calculate weekly average
      if (data && data.length > 0) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentLogs = data.filter(
          (log) => new Date(log.logged_at) >= oneWeekAgo,
        );

        if (recentLogs.length > 0) {
          const avg =
            recentLogs.reduce((sum, log) => sum + log.weight, 0) /
            recentLogs.length;
          setWeeklyAverage(Math.round(avg * 10) / 10);
        }
      }
    } catch (error) {
      console.error("Error fetching weight logs:", error);
      Alert.alert("Error", "Failed to load weight data");
    } finally {
      setLoadingWeights(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await logout();
          setLoggingOut(false);
        },
      },
    ]);
  };

  const handleEditWeight = (log: WeightLog) => {
    setEditingLog(log);
    // Convert to user's preferred unit for editing
    const weightInPreferredUnit = convertWeight(log.weight);
    setEditWeight(weightInPreferredUnit.toFixed(1));
    setEditModalVisible(true);
  };

  const handleSaveEditedWeight = async () => {
    if (!editWeight || isNaN(parseFloat(editWeight)) || !editingLog) {
      Alert.alert("Error", "Please enter a valid weight");
      return;
    }

    try {
      setSavingWeight(true);

      // Convert back to kg if user is using lbs
      const weightInKg =
        unit === "lbs"
          ? parseFloat(editWeight) * 0.453592
          : parseFloat(editWeight);

      console.log("Attempting to update weight log:", {
        id: editingLog.id,
        oldWeight: editingLog.weight,
        newWeight: weightInKg,
        unit: unit,
        userId: user?.id,
      });

      const { data, error } = await supabase
        .from("weight_logs")
        .update({ weight: weightInKg })
        .eq("id", editingLog.id)
        .eq("user_id", user?.id)
        .select();

      console.log("Update response:", { data, error });

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(
          "No rows were updated. Check RLS policies in Supabase.",
        );
      }

      Alert.alert("Success", "Weight updated successfully!");
      setEditModalVisible(false);
      setEditingLog(null);
      setEditWeight("");
      await fetchWeightLogs();
    } catch (error: any) {
      console.error("Error updating weight:", error);
      Alert.alert(
        "Error",
        error.message ||
          "Failed to update weight. Please check Supabase RLS policies.",
      );
    } finally {
      setSavingWeight(false);
    }
  };

  const handleDeleteWeight = (logId: string) => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            console.log("Attempting to delete weight log:", {
              logId,
              userId: user?.id,
            });

            const { data, error } = await supabase
              .from("weight_logs")
              .delete()
              .eq("id", logId)
              .eq("user_id", user?.id)
              .select();

            console.log("Delete response:", { data, error });

            if (error) {
              console.error("Supabase error details:", error);
              throw error;
            }

            if (!data || data.length === 0) {
              throw new Error(
                "No rows were deleted. Check RLS policies in Supabase.",
              );
            }

            Alert.alert("Success", "Entry deleted successfully!");
            await fetchWeightLogs();
          } catch (error: any) {
            console.error("Error deleting weight:", error);
            Alert.alert(
              "Error",
              error.message ||
                "Failed to delete entry. Please check Supabase RLS policies.",
            );
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  return (
    <>
      <WeightModal
        visible={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        userId={user?.id || ""}
        onWeightSaved={async () => {
          await fetchWeightLogs();
        }}
      />
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.editOverlay}>
          <View style={styles.editModalContainer}>
            <Text style={styles.editModalTitle}>Edit Weight ({unit})</Text>
            <TextInput
              style={styles.editInput}
              placeholder={`Enter new weight in ${unit}`}
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
              value={editWeight}
              onChangeText={setEditWeight}
              editable={!savingWeight}
              maxLength={6}
            />
            <View style={styles.editButtonContainer}>
              <TouchableOpacity
                style={styles.editCancelButton}
                onPress={() => setEditModalVisible(false)}
                disabled={savingWeight}
              >
                <Text style={styles.editCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editSaveButton}
                onPress={handleSaveEditedWeight}
                disabled={savingWeight}
              >
                {savingWeight ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.editSaveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={styles.headerSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatar}>
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <Text style={styles.name}>{user?.name || "User"}</Text>
            <Text style={styles.email}>{user?.email || "No email"}</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>
                {user?.role === "admin" ? "Coach" : "Client"}
              </Text>
            </View>
          </View>

          {/* Weight Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Weight Progress</Text>
            {loadingWeights ? (
              <ActivityIndicator size="small" color={palette.accent} />
            ) : weightLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>⚖️</Text>
                <Text style={styles.emptyStateText}>No weight logs yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap the button below to log your weight and start tracking
                </Text>
                <TouchableOpacity
                  style={styles.logWeightButton}
                  onPress={() => setShowWeightModal(true)}
                >
                  <Text style={styles.logWeightButtonText}>Log Weight Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Current</Text>
                    <Text style={styles.metricValue}>
                      {formatWeight(weightLogs[0]?.weight)}
                    </Text>
                    <Text style={styles.metricUnit}>{unit}</Text>
                  </View>

                  {weeklyAverage && (
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Weekly</Text>
                      <Text style={styles.metricValue}>
                        {formatWeight(weeklyAverage)}
                      </Text>
                      <Text style={styles.metricUnit}>{unit}</Text>
                    </View>
                  )}

                  {weightLogs.length > 1 && (
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Change</Text>
                      <Text
                        style={[
                          styles.metricValue,
                          {
                            color:
                              weightLogs[0].weight -
                                weightLogs[weightLogs.length - 1].weight >
                              0
                                ? "#34C759"
                                : "#FF3B30",
                          },
                        ]}
                      >
                        {formatWeight(
                          Math.abs(
                            weightLogs[0].weight -
                              weightLogs[weightLogs.length - 1].weight,
                          ),
                        )}
                      </Text>
                      <Text style={styles.metricUnit}>{unit}</Text>
                    </View>
                  )}
                </View>

                {/* Weight History */}
                <View style={styles.historySection}>
                  <Text style={styles.historyTitle}>Recent Entries</Text>
                  <View style={styles.historyList}>
                    {weightLogs.slice(0, 5).map((log, index) => (
                      <View key={log.id} style={styles.historyItem}>
                        <View style={styles.historyLeft}>
                          <Text style={styles.historyDate}>
                            {formatDate(log.logged_at)}
                          </Text>
                        </View>
                        <View style={styles.historyMiddle}>
                          <Text style={styles.historyWeight}>
                            {formatWeight(log.weight)} {unit}
                          </Text>
                        </View>
                        <View style={styles.historyActions}>
                          <TouchableOpacity
                            onPress={() => handleEditWeight(log)}
                            style={styles.editButton}
                          >
                            <Text style={styles.editButtonText}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteWeight(log.id)}
                            style={styles.deleteButton}
                          >
                            <Text style={styles.deleteButtonText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={[
              styles.logoutButton,
              loggingOut && styles.logoutButtonDisabled,
            ]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.logoutIcon}>→</Text>
                <Text style={styles.logoutText}>Logout</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footerSpacing} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  headerSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    backgroundColor: "linear-gradient(135deg, #5B7FFF 0%, #4A68E6 100%)",
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#5B7FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatar: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  name: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  email: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  roleTag: {
    backgroundColor: "rgba(91, 127, 255, 0.15)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: "#5B7FFF",
  },
  roleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B7FFF",
  },
  statsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  emptyState: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: palette.textSecondary,
    marginBottom: spacing.md,
  },
  logWeightButton: {
    backgroundColor: "#5B7FFF",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    ...shadows.button,
  },
  logWeightButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  metricLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#5B7FFF",
  },
  metricUnit: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  historySection: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: spacing.sm,
  },
  historyList: {
    gap: spacing.xs,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  historyMiddle: {
    flex: 1,
    alignItems: "center",
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5B7FFF",
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  editButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  editButtonText: {
    fontSize: 16,
  },
  deleteButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  editOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  editModalContainer: {
    backgroundColor: "#1C2128",
    borderRadius: 20,
    padding: spacing.lg,
    width: "80%",
    borderWidth: 1,
    borderColor: "#30363D",
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: -0.6,
  },
  editInput: {
    borderWidth: 2,
    borderColor: "#5B7FFF",
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontWeight: "600",
    color: palette.textPrimary,
    backgroundColor: "#22272E",
    marginBottom: spacing.lg,
  },
  editButtonContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  editCancelButton: {
    flex: 1,
    backgroundColor: "#22272E",
    borderWidth: 1,
    borderColor: "#30363D",
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  editCancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.textPrimary,
  },
  editSaveButton: {
    flex: 1,
    backgroundColor: "#5B7FFF",
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  editSaveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  settingsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  settingsList: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
    ...shadows.card,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  settingIcon: {
    fontSize: 20,
    width: 24,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.textPrimary,
  },
  settingArrow: {
    fontSize: 20,
    color: palette.textSecondary,
  },
  logoutButton: {
    marginHorizontal: spacing.lg,
    backgroundColor: "#5B7FFF",
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.button,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutIcon: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footerSpacing: {
    height: spacing.xl,
  },
});

export default ProfileScreen;
