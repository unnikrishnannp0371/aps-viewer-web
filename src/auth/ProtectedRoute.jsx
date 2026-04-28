// ProtectedRoute component to guard routes that require authentication.
// It checks the user's authentication status using the AuthContext.
// If the user is still loading, it shows a loading message.
// If the user is not authenticated, it redirects to the login page.
// If the user is authenticated, it renders the child components.
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { authenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <h2>Loading...</h2>;
  }

  const manualLogout = sessionStorage.getItem("manual_logout");

  if (!authenticated) {
    if (manualLogout === "true") {
      sessionStorage.removeItem("manual_logout");

      return <Navigate to="/" replace />;
    }

    return (
      <Navigate
        to="/"
        replace
        state={{
          message:
            "You must be logged in to access " +
            getPageName(location.pathname),
          from: location.pathname
        }}
      />
    );
  }

  return children;
}

function getPageName(path) {
  return (
    path
      .replace("/", "")
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "this page"
  );
}