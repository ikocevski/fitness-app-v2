import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../config/supabase";
import { useAuth } from "../../context/AuthContext";

interface Client {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface WeeklyWeightSummary {
  weekKey: string;
  weekRange: string;
  logCount: number;
  average: number | null;
  startWeight: number | null;
  endWeight: number | null;
  weeklyChange: number | null;
  weekdayLogs: Array<{
    label: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
    weight: number | null;
  }>;
}

const ManageClientsScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();

  // Permission check
  React.useEffect(() => {
    if (user && user.role !== "admin") {
      console.warn(
        "[ManageClientsScreen] Unauthorized access attempt. User role:",
        user.role,
      );
      Alert.alert(
        "Unauthorized",
        "You don't have permission to access this page.",
        [
          {
            text: "Go Back",
            onPress: () => {
              navigation.goBack();
            },
          },
        ],
      );
    }
  }, [user?.role, navigation]);

  const [clients, setClients] = useState<Client[]>([]);
  const [allUsers, setAllUsers] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklyWeightSummary[]>(
    [],
  );

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // Get coach's clients
      const { data, error } = await supabase
        .from("coach_clients")
        .select("client_id")
        .eq("coach_id", user?.id);

      if (error) throw error;

      const clientIds = (data || []).map((cc) => cc.client_id);

      if (clientIds.length > 0) {
        // Fetch user details from public.users table
        const { data: users, error: userError } = await supabase
          .from("users")
          .select("id, email, name, created_at")
          .in("id", clientIds);

        if (userError) throw userError;

        const mappedClients = (users || []).map((u: any) => ({
          id: u.id,
          email: u.email || "Unknown",
          name: u.name || "Client",
          created_at: u.created_at || "",
        }));

        setClients(mappedClients);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  const searchAvailableClients = async () => {
    if (!searchEmail.trim()) {
      Alert.alert("Input Required", "Please enter an email address");
      return;
    }

    try {
      setSearching(true);

      console.log("[searchAvailableClients] Searching for email:", searchEmail);

      // Search in users table
      const { data: results, error } = await supabase
        .from("users")
        .select("id, email, name")
        .eq("role", "client")
        .ilike("email", `%${searchEmail}%`)
        .limit(10);

      console.log("[searchAvailableClients] Query results:", results);
      console.log("[searchAvailableClients] Query error:", error);

      if (error) throw error;

      if (!results || results.length === 0) {
        console.log("[searchAvailableClients] No results found");
        Alert.alert("Not Found", "No clients found with that email");
        return;
      }

      console.log("[searchAvailableClients] Found clients:", results.length);

      // Filter out already connected clients
      const available = results.filter(
        (r: any) => !clients.find((c) => c.id === r.id),
      );

      if (available.length === 0) {
        Alert.alert(
          "Not Found",
          "All clients found are already connected to your account",
        );
        return;
      }

      // Map to Client interface
      const mapped = available.map((r: any) => ({
        id: r.id,
        email: r.email || "Unknown",
        name: r.name || "Client",
        created_at: "",
      }));

      setAllUsers(mapped);
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Error", "Failed to search clients");
    } finally {
      setSearching(false);
    }
  };

  const addClient = async (clientId: string, clientName: string) => {
    try {
      setLoading(true);

      // Check subscription status and client limit
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("subscription_status, subscription_expires_at, client_limit")
        .eq("id", user?.id)
        .single();

      if (userError) throw userError;

      const normalizedStatus = (
        userData?.subscription_status || ""
      ).toLowerCase();
      const expiryDate = userData?.subscription_expires_at
        ? new Date(userData.subscription_expires_at)
        : null;
      const hasFutureExpiry = expiryDate ? expiryDate > new Date() : false;

      const hasTrialAccess =
        normalizedStatus === "trial" ||
        normalizedStatus === "trialing" ||
        (normalizedStatus === "" && hasFutureExpiry);
      const hasPaidAccess =
        normalizedStatus === "active" ||
        (normalizedStatus === "canceled" && hasFutureExpiry);

      if (!hasTrialAccess && !hasPaidAccess) {
        Alert.alert(
          "Subscription Required",
          "No active trial or subscription found. Please start a free trial or upgrade to add clients.",
        );
        setLoading(false);
        return;
      }

      if (expiryDate && expiryDate < new Date()) {
        Alert.alert(
          "Subscription Expired",
          "Your trial or subscription has expired. Please renew to add clients.",
        );
        setLoading(false);
        return;
      }

      // Check client limit
      const currentClientCount = clients.length;
      const trialDefaultClientLimit = 5;
      const clientLimit =
        userData?.client_limit && userData.client_limit > 0
          ? userData.client_limit
          : hasTrialAccess
            ? trialDefaultClientLimit
            : 0;

      if (currentClientCount >= clientLimit) {
        Alert.alert(
          "Client Limit Reached",
          `You have reached your limit of ${clientLimit} clients. Upgrade your subscription to add more clients.`,
          [
            {
              text: "OK",
              style: "default",
            },
          ],
        );
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("coach_clients").insert([
        {
          coach_id: user?.id,
          client_id: clientId,
        },
      ]);

      if (error) throw error;
      Alert.alert("Success", `${clientName} added as a client`);
      setShowAddModal(false);
      setSearchEmail("");
      setAllUsers([]);
      await fetchClients();
    } catch (error: any) {
      console.error("Error adding client:", error);
      Alert.alert("Error", error.message || "Failed to add client");
    } finally {
      setLoading(false);
    }
  };

  const removeClient = async (clientId: string, clientName: string) => {
    Alert.alert(
      "Remove Client",
      `Are you sure you want to remove ${clientName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("coach_clients")
                .delete()
                .eq("coach_id", user?.id)
                .eq("client_id", clientId);

              if (error) throw error;
              Alert.alert("Success", "Client removed");
              fetchClients();
            } catch (error) {
              Alert.alert("Error", "Failed to remove client");
            }
          },
        },
      ],
    );
  };

  const getStartOfWeekMonday = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    const day = normalized.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    normalized.setDate(normalized.getDate() + diffToMonday);
    return normalized;
  };

  const formatWeekRange = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return `${weekStart.toLocaleDateString("en-US", options)} - ${weekEnd.toLocaleDateString("en-US", options)}`;
  };

  const openClientProgress = async (client: Client) => {
    try {
      setSelectedClient(client);
      setShowProgressModal(true);
      setLoadingProgress(true);

      const { data, error } = await supabase
        .from("weight_logs")
        .select("id, weight, logged_at, created_at")
        .eq("user_id", client.id)
        .order("logged_at", { ascending: false })
        .limit(180);

      if (error) throw error;

      const grouped = new Map<string, { weekStart: Date; logs: any[] }>();

      const logsWithTimestamp = (data || []).map((log: any) => ({
        ...log,
        timestamp: log.logged_at || log.created_at,
      }));

      logsWithTimestamp.forEach((log: any) => {
        if (!log.timestamp) return;
        const logDate = new Date(log.timestamp);
        const weekStart = getStartOfWeekMonday(logDate);
        const weekKey = weekStart.toISOString();

        if (!grouped.has(weekKey)) {
          grouped.set(weekKey, { weekStart, logs: [] });
        }
        grouped.get(weekKey)?.logs.push(log);
      });

      const summaries: WeeklyWeightSummary[] = Array.from(grouped.entries())
        .map(([weekKey, value]) => {
          const sorted = [...value.logs].sort(
            (first, second) =>
              new Date(first.timestamp).getTime() -
              new Date(second.timestamp).getTime(),
          );

          const weekdayLabels: Array<
            "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
          > = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          const weekdayIndexMap = new Map<number, number>([
            [1, 0],
            [2, 1],
            [3, 2],
            [4, 3],
            [5, 4],
            [6, 5],
            [0, 6],
          ]);
          const weekdayWeights: Array<number | null> = [
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ];

          const latestWeekdayLogByIndex = new Map<number, any>();
          sorted.forEach((log: any) => {
            if (!log.timestamp) return;
            const day = new Date(log.timestamp).getDay();
            const mappedIndex = weekdayIndexMap.get(day);
            if (mappedIndex !== undefined) {
              const prev = latestWeekdayLogByIndex.get(mappedIndex);
              if (
                !prev ||
                new Date(log.timestamp).getTime() >
                  new Date(prev.timestamp).getTime()
              ) {
                latestWeekdayLogByIndex.set(mappedIndex, log);
              }
            }
          });

          latestWeekdayLogByIndex.forEach((log, idx) => {
            weekdayWeights[idx] = log.weight;
          });

          const weekdayLogs = weekdayLabels.map((label, index) => ({
            label,
            weight: weekdayWeights[index],
          }));

          const weekLogs = sorted.filter((log: any) => {
            if (!log.timestamp) return false;
            const day = new Date(log.timestamp).getDay();
            return day >= 0 && day <= 6;
          });

          const distinctWeekLogs = Array.from(
            latestWeekdayLogByIndex.values(),
          ).sort(
            (first, second) =>
              new Date(first.timestamp).getTime() -
              new Date(second.timestamp).getTime(),
          );

          const startWeight = distinctWeekLogs[0]?.weight ?? null;
          const endWeight =
            distinctWeekLogs[distinctWeekLogs.length - 1]?.weight ?? null;
          const average =
            distinctWeekLogs.length > 0
              ? Math.round(
                  (distinctWeekLogs.reduce(
                    (sum, item) => sum + item.weight,
                    0,
                  ) /
                    distinctWeekLogs.length) *
                    10,
                ) / 10
              : null;

          return {
            weekKey,
            weekRange: formatWeekRange(value.weekStart),
            logCount: distinctWeekLogs.length || weekLogs.length,
            average,
            startWeight,
            endWeight,
            weeklyChange:
              startWeight !== null && endWeight !== null
                ? Math.round((endWeight - startWeight) * 10) / 10
                : null,
            weekdayLogs,
          };
        })
        .sort(
          (first, second) =>
            new Date(second.weekKey).getTime() -
            new Date(first.weekKey).getTime(),
        );

      setWeeklySummaries(summaries);
    } catch (error) {
      console.error("Error loading client progress:", error);
      Alert.alert("Error", "Failed to load client weekly progress");
      setWeeklySummaries([]);
    } finally {
      setLoadingProgress(false);
    }
  };

  const renderClient = ({ item }: { item: Client }) => (
    <View style={styles.clientCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientEmail}>{item.email}</Text>
      </View>
      <View style={styles.clientActions}>
        <TouchableOpacity
          style={styles.progressButton}
          onPress={() => openClientProgress(item)}
        >
          <Text style={styles.progressButtonText}>📊</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeClient(item.id, item.name)}
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAvailableClient = ({ item }: { item: Client }) => (
    <View style={styles.availableClientCard}>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addClient(item.id, item.name)}
      >
        <Text style={styles.addButtonText}>➕ Add</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && clients.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <LinearGradient
          colors={["#FF7A45", "#FF5E2E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.title}>Manage Clients</Text>
          <Text style={styles.subtitle}>
            {clients.length} {clients.length === 1 ? "client" : "clients"}
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          <TouchableOpacity
            style={styles.addClientButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addClientIcon}>➕</Text>
            <Text style={styles.addClientText}>Add New Client</Text>
          </TouchableOpacity>

          <FlatList
            data={clients}
            renderItem={renderClient}
            keyExtractor={(item) => item.id}
            scrollEnabled
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No clients yet</Text>
                <Text style={styles.emptySubtext}>
                  Add your first client to get started
                </Text>
              </View>
            }
          />
        </View>

        {/* Add Client Modal */}
        <Modal visible={showAddModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Client</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.label}>Search Client by Email</Text>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Enter client email..."
                    value={searchEmail}
                    onChangeText={setSearchEmail}
                    editable={!searching}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.searchButton}
                    onPress={searchAvailableClients}
                    disabled={searching}
                  >
                    <Text style={styles.searchButtonText}>
                      {searching ? "..." : "🔍"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {allUsers.length > 0 && (
                  <>
                    <Text style={styles.resultsLabel}>Available Clients:</Text>
                    <FlatList
                      data={allUsers}
                      renderItem={renderAvailableClient}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                      style={styles.resultsList}
                    />
                  </>
                )}

                {allUsers.length === 0 && searchEmail && !searching && (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>
                      No results. Try another email.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => {
                    setShowAddModal(false);
                    setSearchEmail("");
                    setAllUsers([]);
                  }}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showProgressModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowProgressModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedClient?.name || "Client"} • Weekly Progress
                </Text>
                <TouchableOpacity onPress={() => setShowProgressModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {loadingProgress ? (
                  <ActivityIndicator size="small" color="#FF6B35" />
                ) : weeklySummaries.length === 0 ? (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>
                      No weight logs found for this client.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.progressList}
                    showsVerticalScrollIndicator={false}
                  >
                    {weeklySummaries.map((summary, index) => {
                      const prior = weeklySummaries[index + 1];
                      const weekdayLogs =
                        summary.weekdayLogs ??
                        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                          (label) => ({
                            label,
                            weight: null,
                          }),
                        );
                      const avgDelta =
                        summary.average !== null &&
                        prior &&
                        prior.average !== null
                          ? Math.round((summary.average - prior.average) * 10) /
                            10
                          : null;

                      return (
                        <View
                          key={summary.weekKey}
                          style={styles.weekSummaryCard}
                        >
                          <View style={styles.weekSummaryHeader}>
                            <Text style={styles.weekSummaryTitle}>
                              {summary.weekRange}
                            </Text>
                            <Text style={styles.weekSummaryCount}>
                              {summary.logCount}/7 logs
                            </Text>
                          </View>

                          <View style={styles.weekSummaryMetrics}>
                            <Text style={styles.weekSummaryMetric}>
                              Weekly Avg:{" "}
                              {summary.average !== null
                                ? `${summary.average} kg`
                                : "—"}
                            </Text>
                            <Text style={styles.weekSummaryMetric}>
                              Vs Prev Avg:{" "}
                              {avgDelta !== null
                                ? `${avgDelta > 0 ? "+" : ""}${avgDelta} kg`
                                : "—"}
                            </Text>
                          </View>

                          <View style={styles.weekdayLogsRow}>
                            {weekdayLogs.map((log) => (
                              <View
                                key={`${summary.weekKey}-${log.label}`}
                                style={styles.weekdayLogPill}
                              >
                                <Text style={styles.weekdayLogLabel}>
                                  {log.label}
                                </Text>
                                <Text style={styles.weekdayLogValue}>
                                  {log.weight !== null
                                    ? `${log.weight} kg`
                                    : "—"}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setShowProgressModal(false)}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f0f0f",
  },
  header: {
    padding: 24,
    paddingTop: 54,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addClientButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  addClientIcon: {
    fontSize: 24,
  },
  addClientText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  clientCard: {
    flexDirection: "row",
    backgroundColor: "rgba(28, 33, 40, 0.9)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.22)",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
  },
  clientMeta: {
    marginTop: 4,
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  clientActions: {
    gap: 8,
  },
  progressButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#5B7FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  progressButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.22)",
    backgroundColor: "rgba(28, 33, 40, 0.75)",
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#171717",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255,107,53,0.2)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  closeButton: {
    fontSize: 28,
    color: "#FFE5DC",
    fontWeight: "700",
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFE5DC",
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "rgba(255,107,53,0.3)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,107,53,0.05)",
  },
  searchButton: {
    width: 48,
    borderRadius: 10,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: {
    fontSize: 18,
  },
  resultsLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFE5DC",
    marginTop: 16,
    marginBottom: 12,
  },
  resultsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  availableClientCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.22)",
  },
  addButton: {
    backgroundColor: "#34C759",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  noResults: {
    padding: 20,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
  },
  closeModalButton: {
    backgroundColor: "rgba(255,107,53,0.2)",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.4)",
  },
  closeModalButtonText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#FFE5DC",
  },
  progressList: {
    maxHeight: 420,
    marginBottom: 12,
  },
  weekSummaryCard: {
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.25)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 12,
    marginBottom: 10,
  },
  weekSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  weekSummaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  weekSummaryCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFE5DC",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.35)",
    backgroundColor: "rgba(255,107,53,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  weekSummaryMetrics: {
    gap: 4,
  },
  weekSummaryMetric: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
  },
  weekdayLogsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  weekdayLogPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.28)",
    backgroundColor: "rgba(255,107,53,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weekdayLogLabel: {
    fontSize: 10,
    color: "#FFE5DC",
    fontWeight: "700",
  },
  weekdayLogValue: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

export default ManageClientsScreen;
