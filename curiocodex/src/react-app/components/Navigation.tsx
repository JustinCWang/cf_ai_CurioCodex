/**
 * Navigation component - Main navigation menu for the app.
 */

import { Link, useLocation } from "react-router-dom";
import "./Navigation.css";

function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: "🏠" },
    { path: "/hobbies", label: "Hobbies", icon: "✨" },
    { path: "/items", label: "Items", icon: "📦" },
    { path: "/add", label: "Add", icon: "➕" },
    { path: "/discover", label: "Discover", icon: "🔍" },
    { path: "/activity", label: "Activity", icon: "📜" },
    { path: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <nav className="navigation">
      <ul className="nav-list">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Navigation;

