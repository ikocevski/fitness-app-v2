import React from "react";
import { Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

// Admin Screens
import AdminDashboardScreen from "../screens/admin/DashboardScreen";
import ManageClientsScreen from "../screens/admin/ManageClientsScreen";
import ManageDietsScreen from "../screens/admin/ManageDietsScreen";
import ManageWorkoutsScreen from "../screens/admin/ManageWorkoutsScreen";

type AdminTabParamList = {
  Dashboard: undefined;
  Clients: undefined;
  Workouts: undefined;
  Diets: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

const AdminTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#5B7FFF",
        tabBarInactiveTintColor: "#6E7681",
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
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 26, color }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Clients"
        component={ManageClientsScreen}
        options={{
          tabBarLabel: "Clients",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 26, color }}>👥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Workouts"
        component={ManageWorkoutsScreen}
        options={{
          tabBarLabel: "Workouts",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 26, color }}>💪</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Diets"
        component={ManageDietsScreen}
        options={{
          tabBarLabel: "Diets",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 26, color }}>🥗</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;
