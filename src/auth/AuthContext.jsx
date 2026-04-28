// AuthContext.jsx
// Provides authentication state and session management for the app.
// This context checks the user's authentication status on app load and provides user info to components.
// Components can use the `useAuth` hook to access the current user and loading state.
// Example usage:
// const { user, loading } = useAuth();
// if (loading) return <div>Loading...</div>;
// if (!user) return <Navigate to="/" />;
// return <DashboardPage />;

import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const res = await api.get("/api/v1/auth/status");
      setAuthenticated(res.data.authenticated);
      setUser(res.data.user);
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/v1/auth/logout");
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // ignore if needed
    } finally {
      setAuthenticated(false);
      setUser(null);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated,
        loading,
        checkSession,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);