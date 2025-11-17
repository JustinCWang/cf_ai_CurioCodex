/**
 * Auth indicator component - Shows login status and user info in header.
 */

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./AuthIndicator.css";

function AuthIndicator() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (isAuthenticated && user) {
    return (
      <div className="auth-indicator">
        <div className="user-info">
          <span className="user-icon">👤</span>
          <span className="username">{user.username}</span>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="auth-indicator">
      <Link to="/login" className="login-button">
        Login
      </Link>
    </div>
  );
}

export default AuthIndicator;

