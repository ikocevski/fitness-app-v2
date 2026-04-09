import React from "react";
import RootNavigator from "./navigation/RootNavigator";
import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";

export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <RootNavigator />
      </UserProvider>
    </AuthProvider>
  );
}
