import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../config/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface WeightModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onWeightSaved: () => void;
}

const WeightModal: React.FC<WeightModalProps> = ({
  visible,
  onClose,
  userId,
  onWeightSaved,
}) => {
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      loadUnitPreference();
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

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

  const saveUnitPreference = async (newUnit: "kg" | "lbs") => {
    try {
      await AsyncStorage.setItem("weightUnit", newUnit);
      setUnit(newUnit);
    } catch (error) {
      console.error("Error saving unit preference:", error);
    }
  };

  const handleSaveWeight = async () => {
    if (!weight || isNaN(parseFloat(weight))) {
      Alert.alert("Error", "Please enter a valid weight");
      return;
    }

    try {
      setLoading(true);
      console.log("Saving weight:", weight, "for user:", userId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: existingLog, error: checkError } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", todayISO)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingLog) {
        Alert.alert(
          "Already Logged",
          "You have already logged your weight today. Come back tomorrow!",
        );
        onClose();
        return;
      }

      // Convert lbs to kg if needed (store everything in kg)
      const weightInKg =
        unit === "lbs" ? parseFloat(weight) * 0.453592 : parseFloat(weight);

      const { data, error } = await supabase.from("weight_logs").insert([
        {
          user_id: userId,
          weight: weightInKg,
          logged_at: new Date().toISOString(),
        },
      ]);

      console.log("Supabase response:", { data, error });

      if (error) throw error;

      await AsyncStorage.setItem(
        "lastWeightLogDate",
        new Date().toDateString(),
      );

      console.log("Weight saved successfully!");
      Alert.alert(
        "🎉 Success",
        "Weight logged! Great job tracking your progress!",
      );
      setWeight("");
      onWeightSaved();
      onClose();
    } catch (error: any) {
      console.error("Weight save error:", error);
      Alert.alert("Error", error.message || "Failed to save weight");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("lastWeightLogDate", new Date().toDateString());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    scale: scaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1],
                    }),
                  },
                  {
                    translateY: scaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.headerIcon}>⚖️</Text>
              </View>
              <Text style={styles.title}>Log Your Weight</Text>
              <Text style={styles.subtitle}>Track your daily progress</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Weight</Text>
              <View style={styles.unitToggle}>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    unit === "kg" && styles.unitButtonActive,
                  ]}
                  onPress={() => saveUnitPreference("kg")}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      unit === "kg" && styles.unitButtonTextActive,
                    ]}
                  >
                    kg
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    unit === "lbs" && styles.unitButtonActive,
                  ]}
                  onPress={() => saveUnitPreference("lbs")}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      unit === "lbs" && styles.unitButtonTextActive,
                    ]}
                  >
                    lbs
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your weight"
                  placeholderTextColor="#aaa"
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                  editable={!loading}
                  maxLength={6}
                />
                <Text style={styles.unit}>{unit}</Text>
              </View>
            </View>

            <View style={styles.motivationalText}>
              <Text style={styles.motivationalTextContent}>
                📈 Logging your weight helps track your fitness journey!
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.skipButton]}
                onPress={handleSkip}
                disabled={loading}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveWeight}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Weight</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#1C2128",
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 32,
    width: "86%",
    maxWidth: 440,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: "#30363D",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(91, 127, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#E6EDF3",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: "#8B949E",
    textAlign: "center",
    fontWeight: "500",
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "800",
    color: "#E6EDF3",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  unitToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#22272E",
    borderWidth: 2,
    borderColor: "#30363D",
    alignItems: "center",
  },
  unitButtonActive: {
    backgroundColor: "rgba(91, 127, 255, 0.15)",
    borderColor: "#5B7FFF",
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8B949E",
  },
  unitButtonTextActive: {
    color: "#5B7FFF",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 2.5,
    borderColor: "#5B7FFF",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    fontSize: 18,
    fontWeight: "600",
    color: "#E6EDF3",
    backgroundColor: "#22272E",
  },
  unit: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5B7FFF",
    width: 50,
    textAlign: "center",
    paddingVertical: 18,
    paddingHorizontal: 10,
    backgroundColor: "rgba(91, 127, 255, 0.1)",
    borderRadius: 14,
  },
  motivationalText: {
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#FFB800",
  },
  motivationalTextContent: {
    fontSize: 13,
    color: "#8B949E",
    lineHeight: 18,
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButton: {
    backgroundColor: "#22272E",
    borderWidth: 1,
    borderColor: "#30363D",
  },
  saveButton: {
    backgroundColor: "#5B7FFF",
  },
  skipButtonText: {
    color: "#E6EDF3",
    fontSize: 16,
    fontWeight: "700",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default WeightModal;
