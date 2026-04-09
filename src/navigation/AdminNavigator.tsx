import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import AdminTabNavigator from "./AdminTabNavigator";
import SubscriptionManagementScreen from "../screens/admin/SubscriptionManagementScreen";

const Stack = createStackNavigator();

const AdminNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
      <Stack.Screen
        name="SubscriptionManagement"
        component={SubscriptionManagementScreen}
        options={{ headerShown: true, title: "Subscription" }}
      />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
