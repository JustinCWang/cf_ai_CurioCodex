/**
 * Discover page - Find new hobbies and recommendations using semantic search.
 */

import { useState, useCallback } from "react";
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

function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMethod, setSearchMethod] = useState<"semantic" | "text" | null>(null);
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
          body: JSON.stringify({ query: searchQuery.trim(), limit: 20 }),
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
  }, [searchQuery, token]);

  const totalResults = searchResults 
    ? searchResults.hobbies.length + searchResults.items.length 
    : 0;

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
      </div>
    </div>
  );
}

export default Discover;

