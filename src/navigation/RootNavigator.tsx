import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import ClientTabNavigator from "./ClientTabNavigator";
import AdminNavigator from "./AdminNavigator";
import LoginScreen from "../screens/auth/LoginScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import RoleSelectionScreen from "../screens/auth/RoleSelectionScreen";
import SubscriptionScreen from "../screens/auth/SubscriptionScreen";
import CompleteSignupScreen from "../screens/auth/CompleteSignupScreen";
import ApprovalPendingScreen from "../screens/ApprovalPendingScreen";
import { useAuth } from "../context/AuthContext";
import { ActivityIndicator, View } from "react-native";

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: "#1a1a1a" },
        }}
      >
        {user ? (
          user.role === "new" ? (
            <Stack.Screen
              name="ApprovalPending"
              component={ApprovalPendingScreen}
              options={{ headerShown: false }}
            />
          ) : user.role === "admin" ? (
            <Stack.Screen
              name="Admin"
              component={AdminNavigator}
              options={{ headerShown: false }}
            />
          ) : (
            <Stack.Screen
              name="Client"
              component={ClientTabNavigator}
              options={{ headerShown: false }}
            />
          )
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
                animationEnabled: false,
                cardStyle: { backgroundColor: "#1a1a1a" },
              }}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{
                headerShown: false,
                cardStyle: { backgroundColor: "#1a1a1a" },
              }}
            />
            <Stack.Screen
              name="RoleSelection"
              component={RoleSelectionScreen}
              options={{
                headerShown: false,
                cardStyle: { backgroundColor: "#1a1a1a" },
              }}
            />
            <Stack.Screen
              name="Subscription"
              component={SubscriptionScreen}
              options={{
                headerShown: false,
                cardStyle: { backgroundColor: "#1a1a1a" },
              }}
            />
            <Stack.Screen
              name="CompleteSignup"
              component={CompleteSignupScreen}
              options={{
                headerShown: false,
                cardStyle: { backgroundColor: "#1a1a1a" },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
