/**
 * Auth indicator component - Shows login status and user info in header.
 * On smaller screens, the user icon doubles as a dropdown trigger containing
 * primary navigation links and the logout action.
 */

import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./AuthIndicator.css";

interface NavLinkItem {
  path: string;
  label: string;
}

interface AuthIndicatorProps {
  /** Optional primary navigation links to surface in the mobile dropdown. */
  navLinks?: NavLinkItem[];
}

function AuthIndicator({ navLinks }: AuthIndicatorProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setMenuOpen(false);
  };

  if (isAuthenticated && user) {
    return (
      <div className="auth-indicator">
        {/* Desktop / large-screen view: inline user + logout button */}
        <div className="auth-desktop">
          <div className="user-info">
            <span className="user-icon">👤</span>
            <span className="username">{user.username}</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>

        {/* Mobile / compact view: user icon as dropdown trigger */}
        <div className="auth-mobile">
          <button
            type="button"
            className="auth-trigger"
            aria-label="Open user menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="user-icon">👤</span>
          </button>
          {menuOpen && (
            <div className="auth-menu" role="menu">
              {navLinks &&
                navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.path === "/"}
                    className={({ isActive }) =>
                      `auth-menu-link ${isActive ? "active" : ""}`
                    }
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                  >
                    {link.label}
                  </NavLink>
                ))}
              <button
                type="button"
                onClick={handleLogout}
                className="logout-button auth-menu-logout"
                role="menuitem"
              >
                Logout
              </button>
            </div>
          )}
        </div>
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

