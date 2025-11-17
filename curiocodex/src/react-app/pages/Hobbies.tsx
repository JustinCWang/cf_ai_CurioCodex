/**
 * Hobbies page - Browse and manage all hobbies.
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
import "./Hobbies.css";

interface Hobby {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  created_at: number;
}

function Hobbies() {
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token, isAuthenticated } = useAuth();

  const fetchHobbies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest("/api/hobbies", { method: "GET" }, token);
      const data = await parseResponse<{ hobbies: Hobby[] }>(response);
      setHobbies(data.hobbies);
      setError("");
    } catch (err) {
      console.error("Error fetching hobbies:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load hobbies";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHobbies();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchHobbies]);

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Hobbies</h1>
        <div className="page-content">
          <p>Please log in to view your hobbies.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Hobbies</h1>
        <div className="page-content">
          <p>Loading your hobbies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Hobbies</h1>
      <div className="page-content">
        <div className="hobbies-header">
          <p>Explore your collection of hobbies and curiosities.</p>
          <Link to="/add" className="add-link-button">
            ✨ Add New Hobby
          </Link>
        </div>

        {error && <div className="error-message">{error}</div>}

        {hobbies.length === 0 ? (
          <div className="empty-state">
            <p className="empty-message">✨ No hobbies yet! ✨</p>
            <p className="empty-hint">Start your collection by adding your first hobby.</p>
            <Link to="/add" className="add-link-button">
              Add Your First Hobby
            </Link>
          </div>
        ) : (
          <div className="hobby-grid">
            {hobbies.map((hobby) => (
              <div key={hobby.id} className="hobby-card">
                <div className="card-glow"></div>
                <h3>{hobby.name}</h3>
                {hobby.description && (
                  <p className="card-description">{hobby.description}</p>
                )}
                {hobby.category && (
                  <div className="card-category">
                    <span className="category-label">Category:</span>
                    <span className="category-value">{hobby.category}</span>
                  </div>
                )}
                {hobby.tags && hobby.tags.length > 0 && (
                  <div className="card-tags">
                    {hobby.tags.map((tag, index) => (
                      <span key={index} className="tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="card-footer">
                  <Link to={`/hobbies/${hobby.id}/items`} className="view-items-link">
                    View Items →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Hobbies;

