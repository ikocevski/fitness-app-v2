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
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../../config/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface WeightModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onWeightSaved: () => void;
  initialDate?: Date;
}

const WeightModal: React.FC<WeightModalProps> = ({
  visible,
  onClose,
  userId,
  onWeightSaved,
  initialDate,
}) => {
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [existingLogId, setExistingLogId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      const defaultDate = initialDate ? new Date(initialDate) : new Date();
      defaultDate.setHours(12, 0, 0, 0);
      setSelectedDate(defaultDate);
      setWeight("");
      setExistingLogId(null);
      setShowDatePicker(false);
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
  }, [visible, initialDate, scaleAnim]);

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

  const getDateRangeForQuery = (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  };

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const loadExistingLogForDate = async (date: Date) => {
    if (!userId) return;

    try {
      const { startISO, endISO } = getDateRangeForQuery(date);
      const { data, error } = await supabase
        .from("weight_logs")
        .select("id, weight")
        .eq("user_id", userId)
        .gte("logged_at", startISO)
        .lte("logged_at", endISO)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingLogId(data.id);
        const weightInPreferredUnit =
          unit === "lbs" ? data.weight * 2.20462 : data.weight;
        setWeight(weightInPreferredUnit.toFixed(1));
      } else {
        setExistingLogId(null);
        setWeight("");
      }
    } catch (error) {
      console.error("Error loading existing log:", error);
      setExistingLogId(null);
      setWeight("");
    }
  };

  useEffect(() => {
    if (!visible) return;
    loadExistingLogForDate(selectedDate);
  }, [visible, selectedDate, unit, userId]);

  const handleSaveWeight = async () => {
    if (!weight || isNaN(parseFloat(weight))) {
      Alert.alert("Error", "Please enter a valid weight");
      return;
    }

    try {
      setLoading(true);
      console.log("Saving weight:", weight, "for user:", userId);

      const logDate = new Date(selectedDate);
      logDate.setHours(12, 0, 0, 0);

      const { startISO, endISO } = getDateRangeForQuery(logDate);
      const { data: existingLog, error: checkError } = await supabase
        .from("weight_logs")
        .select("id")
        .eq("user_id", userId)
        .gte("logged_at", startISO)
        .lte("logged_at", endISO)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      const activeLogId = existingLogId || existingLog?.id || null;

      const weightInKg =
        unit === "lbs" ? parseFloat(weight) * 0.453592 : parseFloat(weight);

      if (activeLogId) {
        const { error } = await supabase
          .from("weight_logs")
          .update({
            weight: weightInKg,
            logged_at: logDate.toISOString(),
          })
          .eq("id", activeLogId)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("weight_logs").insert([
          {
            user_id: userId,
            weight: weightInKg,
            logged_at: logDate.toISOString(),
          },
        ]);

        if (error) throw error;
      }

      await AsyncStorage.setItem("lastWeightLogDate", logDate.toDateString());

      Alert.alert(
        "🎉 Success",
        activeLogId
          ? "Weight updated for selected date!"
          : "Weight logged for selected date!",
      );
      setWeight("");
      setExistingLogId(null);
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
    await AsyncStorage.setItem(
      "lastWeightLogDate",
      selectedDate.toDateString(),
    );
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
            <Text style={styles.title}>Log or Edit Weight</Text>
            <Text style={styles.subtitle}>
              Pick a date and save your weight
            </Text>
          </View>

          <View style={styles.body}>
            <View style={styles.dateSection}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                disabled={loading}
              >
                <Text style={styles.dateButtonText}>
                  {formatDateLabel(selectedDate)}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <View style={styles.datePickerWrapper}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, date) => {
                      if (Platform.OS !== "ios") {
                        setShowDatePicker(false);
                      }
                      if (date) {
                        const normalized = new Date(date);
                        normalized.setHours(12, 0, 0, 0);
                        setSelectedDate(normalized);
                      }
                    }}
                    maximumDate={new Date()}
                    themeVariant="dark"
                    textColor="#E6EDF3"
                    accentColor="#5B7FFF"
                    style={styles.datePicker}
                  />
                </View>
              )}

              {existingLogId ? (
                <Text style={styles.dateHint}>
                  Existing entry found for this date. Saving will update it.
                </Text>
              ) : (
                <Text style={styles.dateHint}>
                  No entry for this date yet. Saving will create one.
                </Text>
              )}
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
                  <Text style={styles.saveButtonText}>
                    {existingLogId ? "Update Weight" : "Save Weight"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
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
    borderRadius: 22,
    overflow: "hidden",
    width: "84%",
    maxWidth: 380,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: "#30363D",
  },
  header: {
    marginBottom: 0,
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 22,
    backgroundColor: "#222A44",
    borderBottomWidth: 1,
    borderBottomColor: "#303E66",
    alignItems: "center",
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 18,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(91, 127, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  headerIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#E6EDF3",
    marginBottom: 4,
    textAlign: "center",
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 13,
    color: "#8B949E",
    textAlign: "center",
    fontWeight: "500",
  },
  dateSection: {
    marginBottom: 12,
  },
  datePickerWrapper: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#30363D",
    backgroundColor: "#161B22",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  datePicker: {
    width: "100%",
    height: 176,
  },
  dateButton: {
    borderWidth: 1.5,
    borderColor: "#5B7FFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#22272E",
  },
  dateButtonText: {
    color: "#E6EDF3",
    fontSize: 14,
    fontWeight: "700",
  },
  dateHint: {
    marginTop: 8,
    color: "#8B949E",
    fontSize: 12,
  },
  inputSection: {
    marginBottom: 14,
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
    marginBottom: 10,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 8,
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
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 17,
    fontWeight: "600",
    color: "#E6EDF3",
    backgroundColor: "#22272E",
  },
  unit: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5B7FFF",
    width: 46,
    textAlign: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: "rgba(91, 127, 255, 0.1)",
    borderRadius: 14,
  },

  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 13,
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
