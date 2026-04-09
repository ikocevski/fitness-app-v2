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
} from "react-native";
import { supabase } from "../../config/supabase";
import { useAuth } from "../../context/AuthContext";

interface Client {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

const ManageClientsScreen = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [allUsers, setAllUsers] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);

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
      fetchClients();
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
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeClient(item.id, item.name)}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
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
        <View style={styles.header}>
          <Text style={styles.title}>👥 Manage Clients</Text>
          <Text style={styles.subtitle}>
            {clients.length} {clients.length === 1 ? "client" : "clients"} added
          </Text>
        </View>

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
            scrollEnabled={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>No clients yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap "Add New Client" to add your first client
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    marginTop: 4,
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
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: "#333",
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 13,
    color: "#666",
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#888",
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  closeButton: {
    fontSize: 28,
    color: "#333",
    fontWeight: "700",
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
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
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a1a1a",
    backgroundColor: "#f9f9f9",
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
    color: "#333",
    marginTop: 16,
    marginBottom: 12,
  },
  resultsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  availableClientCard: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
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
    color: "#999",
  },
  closeModalButton: {
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  closeModalButtonText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#333",
  },
});

export default ManageClientsScreen;
