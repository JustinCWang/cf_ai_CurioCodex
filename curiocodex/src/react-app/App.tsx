/**
 * Main React component for the CurioCodex application.
 * Root UI component with mystical/magic-themed design.
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import Hobbies from "./pages/Hobbies";
import Items from "./pages/Items";
import Add from "./pages/Add";
import Discover from "./pages/Discover";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
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
          </Routes>
        </main>
        
        <footer className="footer">
          <p>Powered by ancient magic and modern technology</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
