import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";

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
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#1C2128",
          borderTopColor: "#30363D",
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
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
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Clients"
        component={ManageClientsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Workouts"
        component={ManageWorkoutsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="fitness" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Diets"
        component={ManageDietsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="restaurant" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;
