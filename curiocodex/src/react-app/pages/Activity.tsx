/**
 * Activity page - For now, serves as a simple recommendations UI.
 * Lets the user ask for ideas in natural language and shows suggested items
 * from other users' collections.
 */

import { useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";

interface RecommendationItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  created_at: number;
  hobby_id: string;
  similarity?: number;
  type?: "item";
}

function Activity() {
  const { token, isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  /**
   * Submit handler for the Activity page's "Get Ideas" form.
   * Sends the natural-language query to the recommendations endpoint and
   * displays suggested items from other users' collections.
   */
  const handleRecommend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!query.trim()) {
        return;
      }

      try {
        setLoading(true);
        setError("");
        setHasSearched(true);

        const response = await apiRequest(
          "/api/discover/recommendations",
          {
            method: "POST",
            body: JSON.stringify({ query: query.trim(), limit: 12 }),
          },
          token
        );

        const data = await parseResponse<{
          recommendations: RecommendationItem[];
          searchMethod?: "semantic" | "text";
        }>(response);

        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error("Error getting recommendations:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get recommendations";
        setError(errorMessage);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    },
    [query, token]
  );

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Activity & Ideas</h1>
        <div className="page-content">
          <p>Please log in to see personalized recommendations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Activity & Ideas</h1>
      <div className="page-content">
        <div className="discover-header">
          <p>Ask for ideas based on your collection and other users' items.</p>
          <p className="discover-hint">
            Try things like &quot;collectible spinning tops&quot;, &quot;cozy
            indoor games&quot;, or &quot;creative solo projects&quot;.
          </p>
        </div>

        <form onSubmit={handleRecommend} className="search-form">
          <div className="search-input-container">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you in the mood for?"
              className="search-input"
              disabled={loading}
            />
            <button
              type="submit"
              className="search-button"
              disabled={loading || !query.trim()}
            >
              {loading ? "✨ Finding ideas..." : "✨ Get Ideas"}
            </button>
          </div>
        </form>

        {error && <div className="error-message">{error}</div>}

        {hasSearched && !loading && (
          <>
            {recommendations.length === 0 ? (
              <div className="empty-state">
                <p className="empty-message">🤔 No ideas found yet</p>
                <p className="empty-hint">
                  Try a broader query, or add more hobbies and items to your
                  collection.
                </p>
              </div>
            ) : (
              <div className="search-results">
                <div className="results-header">
                  <div>
                    <h2>Suggested Items</h2>
                    <p className="discover-hint">
                      These come from other users&apos; collections that are
                      similar to your interests and this query.
                    </p>
                  </div>
                  <span className="results-count">
                    Found {recommendations.length} idea
                    {recommendations.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="results-grid">
                  {recommendations.map((item) => (
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
                          <span className="category-value">
                            {item.category}
                          </span>
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
          </>
        )}
      </div>
    </div>
  );
}

export default Activity;
