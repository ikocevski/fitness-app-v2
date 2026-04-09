import React from "react";
import { Text, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

// Client Screens
import HomeScreen from "../screens/client/HomeScreen";
import WorkoutScreen from "../screens/client/WorkoutScreen";
import ProfileScreen from "../screens/client/ProfileScreen";
import DietScreen from "../screens/client/DietScreen";

type ClientTabParamList = {
  Home: undefined;
  Workout: undefined;
  Diet: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<ClientTabParamList>();

const ClientTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#5B7FFF",
        tabBarInactiveTintColor: "#6E7681",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "#1C2128",
          borderTopColor: "#30363D",
          borderTopWidth: 1,
          paddingBottom: 12,
          paddingTop: 12,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 6,
          letterSpacing: 0.3,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 26, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Workout"
        component={WorkoutScreen}
        options={{
          tabBarLabel: "Workouts",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 26, color }}>💪</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Diet"
        component={DietScreen}
        options={{
          tabBarLabel: "Diet",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 26, color }}>🥗</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 26, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default ClientTabNavigator;
