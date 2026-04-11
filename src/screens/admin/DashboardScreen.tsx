import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../config/supabase";
import { palette, radii, spacing, shadows } from "../../theme";
import { deleteCurrentAccount } from "../../services/accountDeletion";

type DashboardStats = {
  totalClients: number;
  upcomingSessions: number;
  pendingRequests: number;
};

type ClientOption = {
  id: string;
  name: string;
  email: string;
};

type SessionItem = {
  id: string;
  coach_id: string;
  client_id: string;
  title: string;
  session_at: string;
  duration_minutes: number;
  status: "scheduled" | "requested" | "booked" | "completed" | "cancelled";
  notes?: string | null;
};

const AdminDashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const screenNavigation = useNavigation();

  // Permission check
  React.useEffect(() => {
    if (user && user.role !== "admin") {
      console.warn(
        "[AdminDashboardScreen] Unauthorized access attempt. User role:",
        user.role,
      );
      Alert.alert(
        "Unauthorized",
        "You don't have permission to access this page.",
        [
          {
            text: "Go Back",
            onPress: () => {
              screenNavigation.goBack();
            },
          },
        ],
      );
    }
  }, [user?.role, screenNavigation]);

  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    upcomingSessions: 0,
    pendingRequests: 0,
  });
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sessionDateTime, setSessionDateTime] = useState<Date>(new Date());
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [pickerDraftDateTime, setPickerDraftDateTime] = useState<Date>(
    new Date(),
  );
  const [allUpcomingSessions, setAllUpcomingSessions] = useState<SessionItem[]>(
    [],
  );
  const [pendingRequests, setPendingRequests] = useState<SessionItem[]>([]);
  const [schedulerEnabled, setSchedulerEnabled] = useState(true);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const clientLinks = await supabase
        .from("coach_clients")
        .select("client_id")
        .eq("coach_id", user?.id);

      if (clientLinks.error) throw clientLinks.error;

      const clientIds = (clientLinks.data || []).map((row) => row.client_id);
      const totalClients = clientIds.length;

      if (clientIds.length > 0) {
        const clientsResp = await supabase
          .from("users")
          .select("id,name,email")
          .in("id", clientIds);

        if (!clientsResp.error) {
          const mappedClients = (clientsResp.data || []).map((client: any) => ({
            id: client.id,
            name: client.name || client.email || "Client",
            email: client.email || "",
          }));
          setClients(mappedClients);
          if (!selectedClientId && mappedClients.length > 0) {
            setSelectedClientId(mappedClients[0].id);
          }
        }
      } else {
        setClients([]);
      }

      const sessionsResp = await supabase
        .from("coach_sessions")
        .select("*")
        .eq("coach_id", user.id)
        .order("session_at", { ascending: true });

      if (sessionsResp.error) {
        setSchedulerEnabled(false);
        setAllUpcomingSessions([]);
        setPendingRequests([]);
        setStats({
          totalClients,
          upcomingSessions: 0,
          pendingRequests: 0,
        });
        return;
      }

      setSchedulerEnabled(true);
      const sessions = (sessionsResp.data || []) as SessionItem[];
      const now = new Date();

      const nextSessions = sessions.filter(
        (session) =>
          (session.status === "scheduled" || session.status === "booked") &&
          new Date(session.session_at) >= now,
      );

      const requestSessions = sessions.filter(
        (session) => session.status === "requested",
      );

      setAllUpcomingSessions(nextSessions);
      setPendingRequests(requestSessions);

      setStats({
        totalClients,
        upcomingSessions: nextSessions.length,
        pendingRequests: requestSessions.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [user?.id, selectedClientId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData]),
  );

  const formatDate = (value: Date) =>
    value.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (value: Date) =>
    value.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

  const openPicker = (mode: "date" | "time") => {
    setPickerMode(mode);
    setPickerDraftDateTime(new Date(sessionDateTime));
    setShowPickerModal(true);
  };

  const onPickerDraftChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed") {
      if (Platform.OS === "android") {
        setShowPickerModal(false);
      }
      return;
    }
    if (event.type !== "set" || !selected) return;
    setPickerDraftDateTime(selected);
  };

  const confirmPickerSelection = () => {
    const next = new Date(sessionDateTime);

    if (pickerMode === "date") {
      next.setFullYear(
        pickerDraftDateTime.getFullYear(),
        pickerDraftDateTime.getMonth(),
        pickerDraftDateTime.getDate(),
      );
    } else {
      next.setHours(
        pickerDraftDateTime.getHours(),
        pickerDraftDateTime.getMinutes(),
        0,
        0,
      );
    }

    setSessionDateTime(next);
    setShowPickerModal(false);
  };

  const createSession = async () => {
    if (!user?.id) return;

    if (!selectedClientId) {
      Alert.alert("Select client", "Please select a client for the session.");
      return;
    }

    if (sessionDateTime.getTime() < Date.now()) {
      Alert.alert("Invalid date/time", "Please choose a future date and time.");
      return;
    }

    try {
      const clientName =
        clients.find((item) => item.id === selectedClientId)?.name || "Client";
      const title = `Session with ${clientName}`;
      const duration =
        Number(durationMinutes) > 0 ? Number(durationMinutes) : 60;

      const sessionInsert = await supabase
        .from("coach_sessions")
        .insert([
          {
            coach_id: user.id,
            client_id: selectedClientId,
            title,
            session_at: sessionDateTime.toISOString(),
            duration_minutes: duration,
            status: "scheduled",
            notes: null,
            created_by: user.id,
          },
        ])
        .select("id")
        .single();

      if (sessionInsert.error) throw sessionInsert.error;

      const client = clients.find((item) => item.id === selectedClientId);
      if (sessionInsert.data?.id) {
        await supabase.from("session_notifications").insert([
          {
            session_id: sessionInsert.data.id,
            user_id: selectedClientId,
            message: `${user.name || "Coach"} scheduled "${title}" on ${formatDate(sessionDateTime)} at ${formatTime(sessionDateTime)}.`,
            read: false,
          },
        ]);
      }

      Alert.alert(
        "Session created",
        `Session scheduled for ${client?.name || "client"}.`,
      );
      const next = new Date();
      next.setHours(next.getHours() + 1, 0, 0, 0);
      setSessionDateTime(next);
      setDurationMinutes("60");
      fetchDashboardData();
    } catch (error) {
      console.error("Error creating session:", error);
      Alert.alert(
        "Scheduler not ready",
        "Please run scheduler migration before using sessions.",
      );
    }
  };

  const approveRequest = async (
    sessionId: string,
    clientId: string,
    title: string,
  ) => {
    if (!user?.id) return;

    try {
      const updateResp = await supabase
        .from("coach_sessions")
        .update({ status: "booked" })
        .eq("id", sessionId)
        .eq("coach_id", user.id);

      if (updateResp.error) throw updateResp.error;

      await supabase.from("session_notifications").insert([
        {
          session_id: sessionId,
          user_id: clientId,
          message: `Your booking request for "${title}" was approved.`,
          read: false,
        },
      ]);

      fetchDashboardData();
    } catch (error) {
      console.error("Error approving request:", error);
      Alert.alert("Error", "Could not approve this booking request.");
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your coach account and all associated clients, workouts, diet plans, weight logs, sessions, and subscription data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteCurrentAccount();

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
                "Your coach account has been deleted successfully.",
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

  const selectedClientName =
    clients.find((item) => item.id === selectedClientId)?.name ||
    "selected client";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#5B7FFF", "#4A68E6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerCopy}>
              <Text style={styles.welcomeText}>Coach Dashboard</Text>
              <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>→</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statNumber}>{stats.totalClients}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Clients
            </Text>
          </View>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => setShowUpcomingModal(true)}
          >
            <Text style={styles.statIcon}>📅</Text>
            <Text style={styles.statNumber}>{stats.upcomingSessions}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Up Next
            </Text>
            <Text style={styles.statHint} numberOfLines={1}>
              Tap to view
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            onPress={() => setShowSchedulerModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionCard, styles.schedulerActionCard]}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>📅</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Session Scheduler</Text>
                <Text style={styles.actionSubtitle}>
                  Book sessions and notify clients
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              navigation.getParent()?.navigate("SubscriptionManagement")
            }
            activeOpacity={0.7}
          >
            <View style={[styles.actionCard, styles.subscriptionCard]}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>💳</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Subscription</Text>
                <Text style={styles.actionSubtitle}>
                  Manage your plan and billing
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Clients")}
            activeOpacity={0.7}
          >
            <View style={styles.actionCard}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>👥</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Manage Clients</Text>
                <Text style={styles.actionSubtitle}>
                  View and manage all clients
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.accountSection}>
          <Text style={styles.accountSectionTitle}>Account</Text>
          <View style={styles.deleteAccountCard}>
            <View style={styles.deleteAccountCopy}>
              <Text style={styles.deleteAccountHeading}>Delete account</Text>
              <Text style={styles.deleteAccountDescription}>
                Permanently remove your coach account and related data.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.deleteAccountButton,
                deletingAccount && styles.deleteAccountButtonDisabled,
              ]}
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? (
                <ActivityIndicator color="#FFD5D1" />
              ) : (
                <Text style={styles.deleteAccountText}>Delete Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerSpacing} />

        <Modal
          visible={showSchedulerModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSchedulerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Schedule Session</Text>
                <TouchableOpacity onPress={() => setShowSchedulerModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {!schedulerEnabled ? (
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>
                    Scheduler tables not found
                  </Text>
                  <Text style={styles.infoText}>
                    Run scheduler migration to enable booking and notifications.
                  </Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.formCard}>
                    <Text style={styles.formLabel}>Client</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.clientPillsRow}
                    >
                      {clients.map((client) => (
                        <TouchableOpacity
                          key={client.id}
                          style={[
                            styles.clientPill,
                            selectedClientId === client.id &&
                              styles.clientPillActive,
                          ]}
                          onPress={() => setSelectedClientId(client.id)}
                        >
                          <Text
                            style={[
                              styles.clientPillText,
                              selectedClientId === client.id &&
                                styles.clientPillTextActive,
                            ]}
                          >
                            {client.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.fixedTitle}>
                      Session with {selectedClientName}
                    </Text>

                    <View style={styles.rowInputs}>
                      <View style={styles.rowInputItem}>
                        <Text style={styles.formLabel}>Date</Text>
                        <TouchableOpacity
                          style={styles.pickerButton}
                          onPress={() => openPicker("date")}
                        >
                          <Text style={styles.pickerButtonText}>
                            {formatDate(sessionDateTime)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.rowInputItem}>
                        <Text style={styles.formLabel}>Time</Text>
                        <TouchableOpacity
                          style={styles.pickerButton}
                          onPress={() => openPicker("time")}
                        >
                          <Text style={styles.pickerButtonText}>
                            {formatTime(sessionDateTime)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.formLabel}>Duration (min)</Text>
                    <TextInput
                      style={styles.input}
                      value={durationMinutes}
                      onChangeText={setDurationMinutes}
                      keyboardType="number-pad"
                      placeholder="60"
                      placeholderTextColor={palette.textTertiary}
                    />

                    <TouchableOpacity
                      style={styles.createSessionButton}
                      onPress={createSession}
                    >
                      <Text style={styles.createSessionButtonText}>
                        Schedule Session + Notify Client
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {stats.pendingRequests > 0 ? (
                    <View style={styles.requestsCard}>
                      <Text style={styles.requestsTitle}>
                        Booking Requests ({stats.pendingRequests})
                      </Text>
                      {pendingRequests.map((request) => {
                        const requestClient = clients.find(
                          (item) => item.id === request.client_id,
                        );
                        return (
                          <View key={request.id} style={styles.requestRow}>
                            <View style={styles.requestInfo}>
                              <Text style={styles.requestTitle}>
                                {request.title}
                              </Text>
                              <Text style={styles.requestMeta}>
                                {requestClient?.name || "Client"} •{" "}
                                {new Date(request.session_at).toLocaleString()}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.approveBtn}
                              onPress={() =>
                                approveRequest(
                                  request.id,
                                  request.client_id,
                                  request.title,
                                )
                              }
                            >
                              <Text style={styles.approveBtnText}>Approve</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </ScrollView>
              )}
            </View>

            {showPickerModal ? (
              <View style={styles.inlinePickerOverlay}>
                <View style={styles.pickerModalCard}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>
                      {pickerMode === "date" ? "Choose Date" : "Choose Time"}
                    </Text>
                    <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <DateTimePicker
                    value={pickerDraftDateTime}
                    mode={pickerMode}
                    display={
                      Platform.OS === "ios"
                        ? "spinner"
                        : pickerMode === "date"
                          ? "calendar"
                          : "clock"
                    }
                    onChange={onPickerDraftChange}
                    minimumDate={pickerMode === "date" ? new Date() : undefined}
                    themeVariant="dark"
                    textColor="#DDE4FF"
                    accentColor="#5B7FFF"
                  />

                  <View style={styles.pickerActionsRow}>
                    <TouchableOpacity
                      style={styles.pickerCancelButton}
                      onPress={() => setShowPickerModal(false)}
                    >
                      <Text style={styles.pickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pickerConfirmButton}
                      onPress={confirmPickerSelection}
                    >
                      <Text style={styles.pickerConfirmText}>✓ Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </Modal>

        <Modal
          visible={showUpcomingModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUpcomingModal(false)}
        >
          <View style={styles.centerModalOverlay}>
            <View style={styles.centerModalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>📅 All Upcoming Sessions</Text>
                <TouchableOpacity onPress={() => setShowUpcomingModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {allUpcomingSessions.length === 0 ? (
                <Text style={styles.emptyText}>No upcoming sessions yet.</Text>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.upcomingListContent}
                >
                  {allUpcomingSessions.map((session) => {
                    const sessionClient = clients.find(
                      (item) => item.id === session.client_id,
                    );
                    return (
                      <View key={session.id} style={styles.upcomingListItem}>
                        <Text style={styles.upcomingTitle}>
                          {session.title}
                        </Text>
                        <Text style={styles.upcomingMeta}>
                          {sessionClient?.name || "Client"} •{" "}
                          {new Date(session.session_at).toLocaleString()}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 54,
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "500",
  },
  logoutButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  accountSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  accountSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  deleteAccountCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 94, 87, 0.35)",
    backgroundColor: "rgba(255, 94, 87, 0.08)",
    padding: spacing.md,
    gap: spacing.md,
  },
  deleteAccountCopy: {
    gap: 4,
  },
  deleteAccountHeading: {
    color: "#FFD5D1",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  deleteAccountDescription: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  deleteAccountButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255, 94, 87, 0.55)",
    backgroundColor: "rgba(255, 59, 48, 0.2)",
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  deleteAccountButtonDisabled: {
    opacity: 0.6,
  },
  deleteAccountText: {
    color: "#FFD5D1",
    fontSize: 15,
    fontWeight: "800",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...shadows.card,
  },
  statIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#5B7FFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  statHint: {
    marginTop: 4,
    fontSize: 11,
    color: palette.textTertiary,
    textAlign: "center",
  },
  quickActions: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  schedulerSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  schedulerActionCard: {
    borderColor: "#5B7FFF",
    borderWidth: 2,
    backgroundColor: "rgba(91,127,255,0.12)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: palette.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    minHeight: "54%",
    maxHeight: "80%",
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: palette.border,
  },
  inlinePickerOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  pickerModalCard: {
    backgroundColor: palette.background,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  centerModalCard: {
    backgroundColor: palette.background,
    borderRadius: radii.xl,
    maxHeight: "70%",
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: palette.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  modalClose: {
    color: palette.textSecondary,
    fontSize: 24,
    fontWeight: "700",
  },
  formCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  formLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 6,
  },
  fixedTitle: {
    color: "#DDE4FF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  pickerButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "rgba(91,127,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: "center",
  },
  pickerButtonText: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  pickerActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pickerCancelButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: palette.surface,
  },
  pickerCancelText: {
    color: palette.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  pickerConfirmButton: {
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#5B7FFF",
  },
  pickerConfirmText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  clientPillsRow: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  clientPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "rgba(91,127,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clientPillActive: {
    borderColor: "#5B7FFF",
    backgroundColor: "rgba(91,127,255,0.24)",
  },
  clientPillText: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  clientPillTextActive: {
    color: "#DDE4FF",
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "rgba(255,255,255,0.02)",
    color: palette.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  rowInputs: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowInputItem: {
    flex: 1,
  },
  createSessionButton: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    backgroundColor: "#5B7FFF",
    paddingVertical: 12,
    alignItems: "center",
  },
  createSessionButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  requestsCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  requestsTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  requestMeta: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  approveBtn: {
    backgroundColor: "rgba(63,185,80,0.22)",
    borderWidth: 1,
    borderColor: "rgba(63,185,80,0.5)",
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  approveBtnText: {
    color: "#B7F7C0",
    fontWeight: "700",
    fontSize: 12,
  },
  upcomingCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    padding: spacing.lg,
  },
  upcomingRow: {
    marginBottom: spacing.sm,
  },
  upcomingListContent: {
    paddingBottom: spacing.xs,
  },
  upcomingListItem: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  upcomingTitle: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  upcomingMeta: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.button,
  },
  subscriptionCard: {
    borderColor: palette.primary,
    borderWidth: 2,
    backgroundColor: "#1a2332",
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#5B7FFF",
    marginBottom: 2,
    letterSpacing: -0.4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: palette.textSecondary,
    fontWeight: "500",
  },
  actionArrow: {
    fontSize: 24,
    color: "#5B7FFF",
  },
  footerSpacing: {
    height: spacing.xxl,
  },
});

export default AdminDashboardScreen;
