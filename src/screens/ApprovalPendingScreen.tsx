import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../config/supabase";

const ApprovalPendingScreen = () => {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Check if user's account has been approved
  const checkApprovalStatus = async () => {
    setCheckingStatus(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Fetch user from public.users table (only query role column)
      const { data: profile, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      // If user is now approved, refresh the session
      if (profile?.role === "client" || profile?.role === "admin") {
        console.log("User approved! Refreshing...");
        // Refresh session to update user metadata
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.error("Error checking approval status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⏳</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Waiting For Access</Text>

        {/* Description */}
        <Text style={styles.description}>
          Thanks for signing up! Your account is currently marked as "new" and
          is waiting for access from the admin. Once approved, you’ll be able to
          enter the app.
        </Text>

        {/* What's Next */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What happens next?</Text>
          <View style={styles.stepContainer}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Our team will review your account information
            </Text>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepText}>You’ll be approved by an admin</Text>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Tap "Check Status" or log back in to access your account
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineContainer}>
          <Text style={styles.timelineTitle}>Expected Timeline</Text>
          <Text style={styles.timelineText}>
            Account reviews typically complete within 24-48 hours. We appreciate
            your patience as we maintain quality standards.
          </Text>
        </View>

        {/* Contact Support */}
        <View style={styles.supportContainer}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            If you have any questions about your account, feel free to contact
            our support team.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.checkButton}
            onPress={checkApprovalStatus}
            disabled={checkingStatus}
          >
            {checkingStatus ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.checkButtonText}>Check Status</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FF6B35" size="small" />
            ) : (
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          We take security and community standards seriously. Thank you for
          understanding.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    paddingTop: 6,
  },
  timelineContainer: {
    backgroundColor: "#FFF8F3",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B35",
    marginBottom: 8,
  },
  timelineText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  supportContainer: {
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: "#4A9EFF",
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4A9EFF",
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  checkButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  logoutButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  logoutButtonText: {
    color: "#FF6B35",
    fontSize: 16,
    fontWeight: "700",
  },
  footerNote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 16,
  },
});

export default ApprovalPendingScreen;
