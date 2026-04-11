import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../config/supabase";
import { palette, radii, spacing, typography, shadows } from "../../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WeightModal from "../../components/common/WeightModal";
import { deleteCurrentAccount } from "../../services/accountDeletion";

interface WeightLog {
  id: string;
  weight: number;
  logged_at: string;
}

const ProfileScreen = () => {
  const { user, logout, loading } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [currentWeekLogCount, setCurrentWeekLogCount] = useState(0);
  const [currentWeekRangeLabel, setCurrentWeekRangeLabel] = useState("");
  const [loadingWeights, setLoadingWeights] = useState(true);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  const getStartOfWeekMonday = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    const day = normalized.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    normalized.setDate(normalized.getDate() + diffToMonday);
    return normalized;
  };

  const formatWeekRange = (start: Date, end: Date) => {
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return `${start.toLocaleDateString("en-US", formatOptions)} - ${end.toLocaleDateString("en-US", formatOptions)}`;
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

      const today = new Date();
      const currentWeekStart = getStartOfWeekMonday(today);
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
      currentWeekEnd.setHours(23, 59, 59, 999);

      setCurrentWeekRangeLabel(
        formatWeekRange(currentWeekStart, currentWeekEnd),
      );

      const currentWeekLogs = (data || []).filter((log) => {
        const loggedDate = new Date(log.logged_at);
        return loggedDate >= currentWeekStart && loggedDate <= currentWeekEnd;
      });

      setCurrentWeekLogCount(currentWeekLogs.length);
    } catch (error) {
      console.error("Error fetching weight logs:", error);
      Alert.alert("Error", "Failed to load weight data");
    } finally {
      setLoadingWeights(false);
    }
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

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data, including workouts, diet plans, weight logs, and subscription records. This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingAccount(true);

            try {
              await deleteCurrentAccount();

              // Best-effort sign out after account deletion.
              try {
                await logout();
              } catch (logoutError) {
                console.warn(
                  "Logout after account deletion failed:",
                  logoutError,
                );
              }

              Alert.alert(
                "Account Deleted",
                "Your account and data have been deleted successfully.",
              );
            } catch (error: any) {
              console.error("Delete account error:", error);
              Alert.alert(
                "Delete Failed",
                error?.message ||
                  "Unable to delete your account right now. Please try again.",
              );
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  const latestLog = weightLogs[0] || null;

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
        initialDate={new Date()}
        onWeightSaved={async () => {
          await fetchWeightLogs();
        }}
      />

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
            <View style={styles.progressPanel}>
              <View style={styles.progressHeader}>
                <Text style={styles.sectionTitle}>Weight Progress</Text>
                <Text style={styles.progressSubtitle}>
                  Track weekly consistency and keep your current weight updated.
                </Text>
              </View>

              {loadingWeights ? (
                <ActivityIndicator size="small" color={palette.accent} />
              ) : (
                <>
                  <View style={styles.snapshotRow}>
                    <Text style={styles.snapshotPill}>
                      Week: {currentWeekRangeLabel || "Mon - Sun"}
                    </Text>
                    <Text style={styles.snapshotPill}>
                      Logs: {currentWeekLogCount}/7
                    </Text>
                  </View>

                  <View style={styles.currentWeightCard}>
                    <Text style={styles.currentWeightLabel}>
                      Current Weight
                    </Text>
                    <View style={styles.currentWeightValueRow}>
                      <Text style={styles.currentWeightValue}>
                        {formatWeight(latestLog?.weight || 0)}
                      </Text>
                      <Text style={styles.currentWeightUnit}>{unit}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.quickLogButton}
                    onPress={() => setShowWeightModal(true)}
                  >
                    <Text style={styles.quickLogButtonIcon}>✎</Text>
                    <Text style={styles.quickLogButtonText}>Log / Edit</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={styles.accountSection}>
            <Text style={styles.accountTitle}>Account Management</Text>
            <Text style={styles.accountSubtitle}>
              You can permanently delete your account directly in the app.
            </Text>

            <TouchableOpacity
              testID="delete-account-button"
              style={[
                styles.deleteAccountButton,
                deletingAccount && styles.deleteAccountButtonDisabled,
              ]}
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteAccountText}>Delete Account</Text>
              )}
            </TouchableOpacity>

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
          </View>

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
    backgroundColor: palette.background,
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
  accountSection: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  accountTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  accountSubtitle: {
    fontSize: 13,
    color: palette.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  progressPanel: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  progressSubtitle: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
  quickLogButton: {
    backgroundColor: "#5B7FFF",
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    ...shadows.button,
  },
  quickLogButtonIcon: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  quickLogButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: 0,
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
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  currentWeightCard: {
    backgroundColor: "rgba(91,127,255,0.08)",
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(91,127,255,0.25)",
  },
  currentWeightLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  currentWeightValueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  currentWeightValue: {
    fontSize: 44,
    fontWeight: "800",
    color: "#5B7FFF",
    letterSpacing: -1,
    lineHeight: 52,
  },
  currentWeightUnit: {
    fontSize: 16,
    color: palette.textSecondary,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  currentWeightHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: palette.textSecondary,
  },
  metricCard: {
    width: "48.5%",
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "rgba(91,127,255,0.08)",
  },
  metricCardWide: {
    width: "100%",
    backgroundColor: "rgba(91,127,255,0.12)",
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(91,127,255,0.35)",
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
  metricGain: {
    color: "#34C759",
  },
  metricLoss: {
    color: "#FF6B6B",
  },
  metricNeutral: {
    color: "#5B7FFF",
  },
  metricUnit: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  progressHeader: {
    marginBottom: spacing.md,
  },
  snapshotRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  snapshotPill: {
    fontSize: 13,
    color: "#DDE4FF",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(91,127,255,0.4)",
    backgroundColor: "rgba(91,127,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: "600",
  },
  historySection: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
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
  weekCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  weekCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  weekRangeText: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  weekLogsCount: {
    color: "#DDE4FF",
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "rgba(91,127,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(91,127,255,0.4)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  weekMetricsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  weekMetricItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(91,127,255,0.22)",
    borderRadius: radii.sm,
    backgroundColor: "rgba(91,127,255,0.08)",
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  weekMetricLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    color: palette.textSecondary,
    marginBottom: 3,
  },
  weekMetricValue: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.textPrimary,
    textAlign: "center",
  },
  weekLogPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  weekLogPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  weekLogPillText: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  weekLogPillValue: {
    color: "#DDE4FF",
    fontSize: 11,
    fontWeight: "700",
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(91,127,255,0.2)",
  },
  editButtonText: {
    fontSize: 14,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,59,48,0.18)",
  },
  deleteButtonText: {
    fontSize: 14,
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
  deleteAccountButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: "#D13B3B",
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.button,
  },
  deleteAccountButtonDisabled: {
    opacity: 0.6,
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footerSpacing: {
    height: spacing.xl,
  },
});

export default ProfileScreen;
