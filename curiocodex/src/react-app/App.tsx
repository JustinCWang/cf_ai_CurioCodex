/**
 * Main React component for the CurioCodex application.
 * Root UI component with mystical/magic-themed design.
 */

import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1 className="title">✨ CurioCodex ✨</h1>
        <p className="subtitle">A mystical repository for your hobbies and curiosities</p>
      </header>
      
      <main className="main-content">
        <section className="hobby-section">
          <h2>Your Collection</h2>
          <div className="hobby-grid">
            {/* Placeholder - will be replaced with dynamic hobby data */}
            <div className="hobby-card">
              <div className="card-glow"></div>
              <h3>New Hobby</h3>
              <p>Begin your journey...</p>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="footer">
        <p>Powered by ancient magic and modern technology</p>
      </footer>
    </div>
  );
}

export default App;
