import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");

  const location = useLocation();
  const message = location.state?.message || "";
  const navigate = useNavigate();
  const from = location.state?.from || "";

  // Initiate login by redirecting to the backend auth endpoint. Store the intended destination if coming from a protected route.
  const handleLogin = () => {
    setLoading(true);
    window.location.href = "http://localhost:3000/api/v1/auth/login";
  };
  // Handle messages and manual logout
  useEffect(() => {
  const manualLogout = sessionStorage.getItem("manual_logout");

  if (manualLogout === "true") {
    sessionStorage.removeItem("manual_logout");
    setBanner("");
    return;
  }

  if (message) {
    if (from) {
      sessionStorage.setItem("redirect_after_login", from);
    }

    setBanner(message);


    const timeout = setTimeout(() => {
      setBanner("");
    }, 5000);

    return () => {
      clearTimeout(timeout);
    };
  } else {
    setBanner("");
  }
}, [message, from, navigate]);
  // Render the login page with a banner for messages and a button to initiate login. Disable the button while loading.
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Simple Viewer</h1>
        <p>Secure access with Autodesk account</p>

        {banner && <div className="info-banner">{banner}</div>}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="login-btn"
        >
          {loading ? "Redirecting..." : "Login with Autodesk"}
        </button>
      </div>
    </div>
  );
}