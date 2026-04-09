import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";

const AnalyticsScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();

  // Permission check
  React.useEffect(() => {
    if (user && user.role !== "admin") {
      console.warn(
        "[AnalyticsScreen] Unauthorized access attempt. User role:",
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

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Analytics Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 18,
  },
});

export default AnalyticsScreen;
