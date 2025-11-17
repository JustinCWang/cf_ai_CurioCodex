/**
 * Main React component for the CurioCodex application.
 * Root UI component with mystical/magic-themed design.
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navigation from "./components/Navigation";
import AuthIndicator from "./components/AuthIndicator";
import Dashboard from "./pages/Dashboard";
import Hobbies from "./pages/Hobbies";
import Items from "./pages/Items";
import Add from "./pages/Add";
import Discover from "./pages/Discover";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <header className="header">
            <AuthIndicator />
            <h1 className="title">✨ CurioCodex ✨</h1>
            <p className="subtitle">A mystical repository for your hobbies and curiosities</p>
          </header>
          
          <Navigation />
          
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/hobbies" element={<Hobbies />} />
              <Route path="/items" element={<Items />} />
              <Route path="/add" element={<Add />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </main>
          
          <footer className="footer">
            <p>Powered by ancient magic and modern technology</p>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
