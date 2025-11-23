/**
 * Main React component for the CurioCodex application.
 * Root UI component with galaxy-themed design and constellation navigation.
 */

import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { useState } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import AuthIndicator from "./components/AuthIndicator";
import Dashboard from "./pages/Dashboard";
import Hobbies from "./pages/Hobbies";
import Items from "./pages/Items";
import Add from "./pages/Add";
import AddHobby from "./pages/AddHobby";
import AddItem from "./pages/AddItem";
import Discover from "./pages/Discover";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./App.css";

function App() {
  const [centerMenuOpen, setCenterMenuOpen] = useState(false);

  const headerRoutes = [
    { path: "/", label: "Atlas" },
    { path: "/hobbies", label: "Hobbies" },
    { path: "/items", label: "Items" },
    { path: "/discover", label: "Discover" },
    { path: "/activity", label: "Activity" },
    { path: "/settings", label: "Settings" },
  ];

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <header className="header">
            <NavLink
              to="/"
              end
              className="header-left brand-link"
            >
              <div className="brand-mark" aria-hidden="true">
                ✧
              </div>
              <div className="brand-meta">
                <span className="brand-name">CurioCodex</span>
              </div>
            </NavLink>

            <nav className="header-center" aria-label="Primary">
              <div className="header-links">
                {headerRoutes.map((route, index) => (
                  <span key={route.path} className="header-center-item">
                    <NavLink
                      to={route.path}
                      className={({ isActive }) =>
                        `header-nav-link ${isActive ? "active" : ""}`
                      }
                      end={route.path === "/"}
                    >
                      {route.label}
                    </NavLink>
                    {index < headerRoutes.length - 1 && (
                      <span className="header-separator" aria-hidden="true">
                        •
                      </span>
                    )}
                  </span>
                ))}
              </div>

              <button
                type="button"
                className="header-center-trigger"
                aria-label="Open navigation menu"
                aria-expanded={centerMenuOpen}
                onClick={() => setCenterMenuOpen((open) => !open)}
              >
                ☰
              </button>

              {centerMenuOpen && (
                <div className="header-center-menu">
                  {headerRoutes.map((route) => (
                    <NavLink
                      key={route.path}
                      to={route.path}
                      className={({ isActive }) =>
                        `header-nav-link ${isActive ? "active" : ""}`
                      }
                      end={route.path === "/"}
                      onClick={() => setCenterMenuOpen(false)}
                    >
                      {route.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </nav>

            <div className="header-right">
              <AuthIndicator navLinks={headerRoutes} />
            </div>
          </header>

          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/hobbies" element={<Hobbies />} />
              <Route path="/hobbies/:hobbyId/items" element={<Items />} />
              <Route path="/items" element={<Items />} />
              <Route path="/add" element={<Add />} />
              <Route path="/add/hobby" element={<AddHobby />} />
              <Route path="/add/item" element={<AddItem />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </main>
          
          <footer className="footer">
            <p>© 2025 CurioCodex · Powered by your curiosity and modern technology</p>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
