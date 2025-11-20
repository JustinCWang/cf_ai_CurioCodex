/**
 * Discover page - Find new hobbies and recommendations using semantic search.
 */

import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
import "./Discover.css";

interface SearchResult {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  created_at: number;
  type: "hobby" | "item";
  similarity?: number;
  hobby_id?: string;
}

interface SearchResponse {
  hobbies: SearchResult[];
  items: SearchResult[];
  searchMethod: "semantic" | "text";
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMethod, setSearchMethod] = useState<"semantic" | "text" | null>(null);
  const [preferredMode, setPreferredMode] = useState<"semantic" | "text">("semantic");
  
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

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setHasSearched(true);

      const response = await apiRequest(
        "/api/discover/search",
        {
          method: "POST",
          body: JSON.stringify({
            query: searchQuery.trim(),
            limit: 20,
            mode: preferredMode,
          }),
        },
        token
      );

      const data = await parseResponse<SearchResponse>(response);
      setSearchResults(data);
      setSearchMethod(data.searchMethod);
    } catch (err) {
      console.error("Error searching:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to perform search";
      setError(errorMessage);
      setSearchResults(null);
      setSearchMethod(null);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, preferredMode, token]);

  const totalResults = searchResults 
    ? searchResults.hobbies.length + searchResults.items.length 
    : 0;

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
          <p>Please log in to search your hobbies and items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Discover</h1>
      <div className="page-content">
        <div className="discover-header">
          <p>Search through your hobbies and items using natural language.</p>
          <p className="discover-hint">
            Try searching for things like "outdoor activities", "creative hobbies", or "relaxing pastimes"
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-mode-toggle">
            <button
              type="button"
              className={`mode-button ${preferredMode === "semantic" ? "active" : ""}`}
              onClick={() => setPreferredMode("semantic")}
              disabled={loading}
            >
              🧠 Semantic
            </button>
            <button
              type="button"
              className={`mode-button ${preferredMode === "text" ? "active" : ""}`}
              onClick={() => setPreferredMode("text")}
              disabled={loading}
            >
              🔤 Text
            </button>
            <span className="mode-help">
              {preferredMode === "semantic"
                ? "AI-powered search by meaning (falls back to text if needed)."
                : "Simple keyword search only."}
            </span>
          </div>

          <div className="search-input-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your hobbies and items..."
              className="search-input"
              disabled={loading}
            />
            <button type="submit" className="search-button" disabled={loading || !searchQuery.trim()}>
              {loading ? "🔍 Searching..." : "🔍 Search"}
            </button>
          </div>
        </form>

        {error && <div className="error-message">{error}</div>}

        {/* Search Results */}
        {hasSearched && !loading && (
          <>
            {totalResults === 0 ? (
              <div className="empty-state">
                <p className="empty-message">🔍 No results found</p>
                <p className="empty-hint">
                  Try a different search query or check your spelling.
                </p>
              </div>
            ) : (
              <div className="search-results">
                <div className="results-header">
                  <div>
                    <h2>Search Results</h2>
                    {searchMethod && (
                      <div className={`search-method-badge ${searchMethod}`}>
                        {searchMethod === "semantic" ? (
                          <>
                            <span className="badge-icon">🧠</span>
                            <span>Semantic Search (AI-powered)</span>
                          </>
                        ) : (
                          <>
                            <span className="badge-icon">🔤</span>
                            <span>Text Search (Keyword matching)</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="results-count">
                    Found {totalResults} result{totalResults !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Hobbies Section */}
                {searchResults && searchResults.hobbies.length > 0 && (
                  <div className="results-section">
                    <h3 className="section-title">✨ Hobbies ({searchResults.hobbies.length})</h3>
                    <div className="results-grid">
                      {searchResults.hobbies.map((hobby) => (
                        <div key={hobby.id} className="result-card hobby-card">
                          <div className="card-glow"></div>
                          {hobby.similarity !== undefined && (
                            <div className="similarity-badge">
                              {Math.round(hobby.similarity * 100)}% match
                            </div>
                          )}
                          <h4>{hobby.name}</h4>
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
                            <Link to={`/hobbies/${hobby.id}/items`} className="view-link">
                              View Items →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items Section */}
                {searchResults && searchResults.items.length > 0 && (
                  <div className="results-section">
                    <h3 className="section-title">📦 Items ({searchResults.items.length})</h3>
                    <div className="results-grid">
                      {searchResults.items.map((item) => (
                        <div key={item.id} className="result-card item-card">
                          <div className="card-glow"></div>
                          {item.similarity !== undefined && (
                            <div className="similarity-badge">
                              {Math.round(item.similarity * 100)}% match
                            </div>
                          )}
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
                              {item.tags.map((tag, index) => (
                                <span key={index} className="tag">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Initial State */}
        {!hasSearched && (
          <div className="discover-intro">
            <div className="intro-card">
              <h2>🔍 Semantic Search</h2>
              <p>
                Use natural language to find hobbies and items in your collection. 
                Our AI understands meaning, not just keywords.
              </p>
              <div className="example-searches">
                <h3>Example searches:</h3>
                <ul>
                  <li>"outdoor activities"</li>
                  <li>"creative and relaxing hobbies"</li>
                  <li>"things related to photography"</li>
                  <li>"collecting hobbies"</li>
                </ul>
              </div>
            </div>
          </div>
        )}

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
                            {item.tags.map((tag, index) => (
                              <span key={index} className="tag">
                                #{tag}
                              </span>
                            ))}
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

