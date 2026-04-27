import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
  try {
    setLoggingOut(true);

    sessionStorage.setItem("manual_logout", "true");

    navigate("/", { replace: true });

    await logout();
  } catch (error) {
    setLoggingOut(false);
  }
};

  return (
    <div className="dashboard-page">
      {loggingOut && (
        <div className="screen-loader">
          <div className="loader-box">
            <div className="spinner"></div>
            <p>Signing out...</p>
          </div>
        </div>
      )}

      <header className="dashboard-header">
        <h1>APS Viewer</h1>

        <button className="logout-btn" onClick={handleLogout} disabled={loggingOut}>
          Logout
        </button>
      </header>

      <main className="dashboard-content">
        <h2>Welcome back, {user?.name}</h2>
      </main>
    </div>
  );
}