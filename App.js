import "react-native-url-polyfill/auto";
import React from "react";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { UserProvider } from "./src/context/UserContext";

export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <RootNavigator />
      </UserProvider>
    </AuthProvider>
  );
}
