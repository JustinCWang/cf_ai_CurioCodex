/**
 * Discover page - Get AI-powered recommendations based on your hobbies.
 */

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
import "./Discover.css";

interface RecommendationItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  created_at: number;
  hobby_id: string;
  similarity: number;
  type: "item";
}

interface RecommendationsResponse {
  recommendations: RecommendationItem[];
  searchMethod: "semantic" | "text";
}

interface Hobby {
  id: string;
  name: string;
}

function Discover() {
  // Recommendations state
  const [recommendationQuery, setRecommendationQuery] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [hasRequestedRecommendations, setHasRequestedRecommendations] = useState(false);
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [addToHobbyModal, setAddToHobbyModal] = useState<{ item: RecommendationItem; hobbyId: string } | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  
  const { token, isAuthenticated } = useAuth();

  // Fetch user's hobbies for the "Add to hobby" modal
  useEffect(() => {
    if (isAuthenticated && token) {
      const fetchHobbies = async () => {
        try {
          const response = await apiRequest("/api/hobbies", { method: "GET" }, token);
          const data = await parseResponse<{ hobbies: Hobby[] }>(response);
          setHobbies(data.hobbies);
        } catch (err) {
          console.error("Error fetching hobbies:", err);
        }
      };
      fetchHobbies();
    }
  }, [isAuthenticated, token]);

  const handleGetRecommendations = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setRecommendationsLoading(true);
      setRecommendationsError("");
      setHasRequestedRecommendations(true);

      const response = await apiRequest(
        "/api/discover/recommendations",
        {
          method: "POST",
          body: JSON.stringify({
            query: recommendationQuery.trim() || undefined,
            limit: 12,
          }),
        },
        token
      );

      const data = await parseResponse<RecommendationsResponse>(response);
      setRecommendations(data.recommendations);
    } catch (err) {
      console.error("Error getting recommendations:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to get recommendations";
      setRecommendationsError(errorMessage);
      setRecommendations([]);
    } finally {
      setRecommendationsLoading(false);
    }
  }, [recommendationQuery, token]);

  const handleAddToHobby = async () => {
    if (!addToHobbyModal || !token) return;

    try {
      setAddingItem(true);
      
      // Create the item in the user's selected hobby using the recommended item's details
      const response = await apiRequest(
        `/api/hobbies/${addToHobbyModal.hobbyId}/items`,
        {
          method: "POST",
          body: JSON.stringify({
            name: addToHobbyModal.item.name,
            description: addToHobbyModal.item.description,
            category: addToHobbyModal.item.category,
          }),
        },
        token
      );

      await parseResponse(response);
      setAddToHobbyModal(null);
      // Optionally refresh recommendations or show success message
      alert(`"${addToHobbyModal.item.name}" added to your collection!`);
    } catch (err) {
      console.error("Error adding item:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to add item";
      alert(errorMessage);
    } finally {
      setAddingItem(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Discover</h1>
        <div className="page-content">
          <p>Please log in to get personalized recommendations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Discover</h1>
      <div className="page-content">
        <div className="discover-header">
          <p>Get AI-powered item recommendations based on your hobbies and interests.</p>
          <p className="discover-hint">
            Describe what you&apos;re in the mood for, or leave it blank to use your existing hobbies.
          </p>
        </div>

        {/* Recommendations Section */}
        <div className="recommendations-section">
          <div className="recommendations-header">
            <h2>✨ Recommendations</h2>
            <p className="recommendations-subtitle">
              Discover items from other collectors that match your interests. 
              {recommendationQuery.trim() 
                ? ` Based on: "${recommendationQuery.trim()}"`
                : " Based on your current hobbies."}
            </p>
          </div>

          <form onSubmit={handleGetRecommendations} className="recommendations-form">
            <div className="recommendations-input-container">
              <input
                type="text"
                value={recommendationQuery}
                onChange={(e) => setRecommendationQuery(e.target.value)}
                placeholder="What are you in the mood for? (e.g., 'indoor strategy games', 'collectible toys')"
                className="recommendations-input"
                disabled={recommendationsLoading}
              />
              <button 
                type="submit" 
                className="recommendations-button" 
                disabled={recommendationsLoading}
              >
                {recommendationsLoading ? "✨ Finding..." : "✨ Get Recommendations"}
              </button>
            </div>
            <p className="recommendations-hint">
              Leave blank to get recommendations based on your existing hobbies, or describe what you're looking for.
            </p>
          </form>

          {recommendationsError && (
            <div className="error-message">{recommendationsError}</div>
          )}

          {/* Recommendations Results */}
          {hasRequestedRecommendations && !recommendationsLoading && (
            <>
              {recommendations.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-message">✨ No recommendations found</p>
                  <p className="empty-hint">
                    Try adjusting your query or add more hobbies to your collection to get better recommendations.
                  </p>
                </div>
              ) : (
                <div className="recommendations-results">
                  <div className="results-header">
                    <h3>Recommended Items ({recommendations.length})</h3>
                    <p className="recommendations-note">
                      These items are from other collectors and match your interests.
                    </p>
                  </div>
                  <div className="results-grid">
                    {recommendations.map((item) => (
                      <div key={item.id} className="result-card recommendation-card">
                        <div className="card-glow"></div>
                        <div className="similarity-badge">
                          {Math.round(item.similarity * 100)}% match
                        </div>
                        <h4>{item.name}</h4>
                        {item.description && (
                          <p className="card-description">{item.description}</p>
                        )}
                        {item.category && (
                          <div className="card-category">
                            <span className="category-label">Category:</span>
                            <span className="category-value">{item.category}</span>
                          </div>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="card-tags">
                            {item.tags.slice(0, 2).map((tag, index) => (
                              <span key={index} className="tag">
                                #{tag}
                              </span>
                            ))}
                            {item.tags.length > 2 && (
                              <span className="tag more-tag">+{item.tags.length - 2} tags</span>
                            )}
                          </div>
                        )}
                        <div className="card-footer">
                          <button
                            className="add-to-collection-button"
                            onClick={() => setAddToHobbyModal({ item, hobbyId: hobbies[0]?.id || "" })}
                            disabled={hobbies.length === 0}
                            title={hobbies.length === 0 ? "Create a hobby first" : "Add to my collection"}
                          >
                            ➕ Add to Collection
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Add to Hobby Modal */}
        {addToHobbyModal && (
          <div className="modal-overlay" onClick={() => setAddToHobbyModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Add to Your Collection</h2>
              <p>Select which hobby to add "{addToHobbyModal.item.name}" to:</p>
              <div className="form-group">
                <label htmlFor="select-hobby">Hobby *</label>
                <select
                  id="select-hobby"
                  value={addToHobbyModal.hobbyId}
                  onChange={(e) => setAddToHobbyModal({ ...addToHobbyModal, hobbyId: e.target.value })}
                  className="form-input"
                  disabled={addingItem}
                >
                  {hobbies.length === 0 ? (
                    <option value="">No hobbies available. Create a hobby first.</option>
                  ) : (
                    hobbies.map((hobby) => (
                      <option key={hobby.id} value={hobby.id}>
                        {hobby.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="modal-actions">
                <button 
                  className="cancel-button" 
                  onClick={() => setAddToHobbyModal(null)}
                  disabled={addingItem}
                >
                  Cancel
                </button>
                <button 
                  className="save-button" 
                  onClick={handleAddToHobby}
                  disabled={addingItem || !addToHobbyModal.hobbyId || hobbies.length === 0}
                >
                  {addingItem ? "Adding..." : "Add Item"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Discover;

