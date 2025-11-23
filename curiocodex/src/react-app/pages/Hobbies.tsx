/**
 * Hobbies page - Browse and manage all hobbies.
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
import { CATEGORIES } from "../utils/categories";
import "./Hobbies.css";

interface Hobby {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  created_at: number;
}

interface SearchHobbyResult extends Hobby {
  similarity?: number;
}

function Hobbies() {
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list" | "icon">("card");
  const [editingHobby, setEditingHobby] = useState<Hobby | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editItemCategories, setEditItemCategories] = useState<string[]>([]);
  const [editItemCategoryDraft, setEditItemCategoryDraft] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedHobby, setSelectedHobby] = useState<Hobby | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"semantic" | "text">("semantic");
  const [searchResults, setSearchResults] = useState<SearchHobbyResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchMethod, setSearchMethod] = useState<"semantic" | "text" | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
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

  const handleHobbySearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setHasSearched(false);
        setSearchResults(null);
        setSearchError("");
        setSearchMethod(null);
        return;
      }

      try {
        setSearchLoading(true);
        setSearchError("");
        setHasSearched(true);

        const response = await apiRequest(
          "/api/search",
          {
            method: "POST",
            body: JSON.stringify({
              query: trimmed,
              limit: 40,
              mode: searchMode,
            }),
          },
          token
        );

        const data = await parseResponse<{
          hobbies: SearchHobbyResult[];
          searchMethod: "semantic" | "text";
        }>(response);

        setSearchResults(data.hobbies || []);
        setSearchMethod(data.searchMethod);
      } catch (err) {
        console.error("Error searching hobbies:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search hobbies";
        setSearchError(errorMessage);
        setSearchResults(null);
        setSearchMethod(null);
      } finally {
        setSearchLoading(false);
      }
    },
    [searchQuery, searchMode, token]
  );

  const isSearching = hasSearched && !!searchQuery.trim();
  const hobbiesToRender: Hobby[] =
    isSearching && searchResults ? searchResults : hobbies;
  const totalHobbies = hobbiesToRender.length;

  const handleEdit = async (hobby: Hobby) => {
    setEditingHobby(hobby);
    setEditName(hobby.name);
    setEditDescription(hobby.description || "");
    setEditCategory(hobby.category || "");

    try {
      const response = await apiRequest(
        `/api/hobbies/${hobby.id}/item-categories`,
        { method: "GET" },
        token
      );
      const data = await parseResponse<{
        hobbyCategory: string | null;
        itemCategories: string[];
        definedCategories?: string[];
      }>(response);
      const defined = data.definedCategories && data.definedCategories.length > 0
        ? data.definedCategories
        : data.itemCategories;
      const unique = Array.from(
        new Set(
          defined
            .map((c) => c.trim())
            .filter((c) => c.length > 0)
        )
      );
      setEditItemCategories(unique);
      setEditItemCategoryDraft("");
    } catch (err) {
      console.error("Error fetching hobby item categories:", err);
      setEditItemCategories([]);
      setEditItemCategoryDraft("");
    }
  };

  const handleCancelEdit = () => {
    setEditingHobby(null);
    setEditName("");
    setEditDescription("");
    setEditCategory("");
    setEditItemCategories([]);
    setEditItemCategoryDraft("");
  };

  const handleSaveEdit = async () => {
    if (!editingHobby || !editName.trim()) {
      return;
    }

    try {
      const requestBody: {
        name: string;
        description: string | null;
        category?: string;
        itemCategories?: string[];
      } = {
        name: editName.trim(),
        description: editDescription.trim() || null,
      };
      
      // Include category if manually selected (empty string means use AI)
      if (editCategory) {
        requestBody.category = editCategory;
      }

      // Optional: include updated item category definitions for this hobby
      if (editItemCategories.length > 0) {
        requestBody.itemCategories = editItemCategories;
      }

      const response = await apiRequest(
        `/api/hobbies/${editingHobby.id}`,
        {
          method: "PUT",
          body: JSON.stringify(requestBody),
        },
        token
      );
      await parseResponse(response);
      await fetchHobbies();
      handleCancelEdit();
    } catch (err) {
      console.error("Error updating hobby:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update hobby";
      setError(errorMessage);
    }
  };

  const handleDelete = async (hobbyId: string) => {
    try {
      const response = await apiRequest(
        `/api/hobbies/${hobbyId}`,
        { method: "DELETE" },
        token
      );
      await parseResponse(response);
      await fetchHobbies();
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting hobby:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete hobby";
      setError(errorMessage);
    }
  };

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

        {/* Hobby search (semantic / text) */}
        <form onSubmit={handleHobbySearch} className="hobbies-search-form">
          <div className="hobbies-search-mode-toggle">
            <button
              type="button"
              className={`mode-button ${searchMode === "semantic" ? "active" : ""}`}
              onClick={() => setSearchMode("semantic")}
              disabled={searchLoading}
            >
              🧠 Semantic
            </button>
            <button
              type="button"
              className={`mode-button ${searchMode === "text" ? "active" : ""}`}
              onClick={() => setSearchMode("text")}
              disabled={searchLoading}
            >
              🔤 Text
            </button>
            <span className="mode-help">
              {searchMode === "semantic"
                ? "AI-powered search by meaning (falls back to text if needed)."
                : "Simple keyword search only."}
            </span>
          </div>

          <div className="hobbies-search-input-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your hobbies..."
              className="hobbies-search-input"
              disabled={searchLoading}
            />
            <button
              type="submit"
              className="hobbies-search-button"
              disabled={searchLoading}
            >
              {searchLoading ? "🔍 Searching..." : "🔍 Search"}
            </button>
            {isSearching && (
              <button
                type="button"
                className="hobbies-search-clear"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                  setHasSearched(false);
                  setSearchError("");
                  setSearchMethod(null);
                }}
                disabled={searchLoading}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {searchError && (
          <div className="error-message" style={{ marginTop: "0.75rem" }}>
            {searchError}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {!isSearching && hobbies.length === 0 ? (
          <div className="empty-state">
            <p className="empty-message">✨ No hobbies yet! ✨</p>
            <p className="empty-hint">Start your collection by adding your first hobby.</p>
            <Link to="/add" className="add-link-button">
              Add Your First Hobby
            </Link>
          </div>
        ) : (
          <>
            <div className="hobbies-toolbar">
              <div
                className="hobbies-view-toggle"
                role="radiogroup"
                aria-label="Change hobby layout"
              >
                <button
                  type="button"
                  className={`view-toggle-button ${
                    viewMode === "card" ? "active" : ""
                  }`}
                  onClick={() => setViewMode("card")}
                  role="radio"
                  aria-checked={viewMode === "card"}
                >
                  <span className="view-toggle-icon">🧊</span>
                  <span className="view-toggle-label">Card</span>
                </button>
                <button
                  type="button"
                  className={`view-toggle-button ${
                    viewMode === "list" ? "active" : ""
                  }`}
                  onClick={() => setViewMode("list")}
                  role="radio"
                  aria-checked={viewMode === "list"}
                >
                  <span className="view-toggle-icon">📄</span>
                  <span className="view-toggle-label">List</span>
                </button>
                <button
                  type="button"
                  className={`view-toggle-button ${
                    viewMode === "icon" ? "active" : ""
                  }`}
                  onClick={() => setViewMode("icon")}
                  role="radio"
                  aria-checked={viewMode === "icon"}
                >
                  <span className="view-toggle-icon">🔳</span>
                  <span className="view-toggle-label">Icon</span>
                </button>
              </div>
            </div>

            {isSearching && (
              <div className="hobbies-search-summary">
                <span>
                  Showing {totalHobbies} hobby{totalHobbies !== 1 ? "ies" : "y"}
                  {searchMethod
                    ? ` · ${
                        searchMethod === "semantic" ? "Semantic" : "Text"
                      } search`
                    : ""}
                </span>
              </div>
            )}

            {hobbiesToRender.length === 0 ? (
              <div className="empty-state">
                <p className="empty-message">🔍 No hobbies found</p>
                <p className="empty-hint">
                  Try a different search query or switch between semantic and text search.
                </p>
              </div>
            ) : (
              <>
                {viewMode === "card" && (
                  <div className="hobby-grid">
              {hobbiesToRender.map((hobby) => (
                <div
                  key={hobby.id}
                  className="hobby-card"
                  onClick={() => setSelectedHobby(hobby)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedHobby(hobby);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
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
                      {hobby.tags.slice(0, 2).map((tag, index) => (
                        <span key={index} className="tag">
                          #{tag}
                        </span>
                      ))}
                      {hobby.tags.length > 2 && (
                        <span className="tag more-tag">+{hobby.tags.length - 2} tags</span>
                      )}
                    </div>
                  )}
                  <div className="card-footer">
                    <div className="card-actions">
                      <Link
                        to={`/hobbies/${hobby.id}/items`}
                        className="view-items-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Items →
                      </Link>
                      <div className="action-buttons">
                        <button
                          className="edit-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(hobby);
                          }}
                          title="Edit hobby"
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(hobby.id);
                          }}
                          title="Delete hobby"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
                  </div>
                )}

                {viewMode === "list" && (
                  <div className="hobbies-list">
                {hobbiesToRender.map((hobby) => (
                  <div key={hobby.id} className="hobby-row">
                    <div className="hobby-row-main">
                      <Link to={`/hobbies/${hobby.id}/items`} className="hobby-row-link">
                        <span className="hobby-row-name">{hobby.name}</span>
                      </Link>
                      {hobby.category && (
                        <span className="hobby-row-category">
                          {hobby.category}
                        </span>
                      )}
                    </div>
                    <div className="hobby-row-description">
                      {hobby.description || <span style={{color: "#666", fontStyle: "italic"}}>No description</span>}
                    </div>
                    <div className="hobby-row-meta">
                      {hobby.tags && hobby.tags.length > 0 && (
                        <div className="hobby-row-tags">
                          {hobby.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="hobby-row-tag">
                              #{tag}
                            </span>
                          ))}
                          {hobby.tags.length > 3 && (
                            <span className="hobby-row-tag" style={{ borderStyle: "dashed" }}>
                              +{hobby.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="hobby-row-actions">
                        <Link to={`/hobbies/${hobby.id}/items`} className="view-items-link" style={{marginRight: "10px", fontSize: "0.85rem"}}>
                          Items →
                        </Link>
                        <button
                          className="edit-button"
                          onClick={() => handleEdit(hobby)}
                          title="Edit hobby"
                          style={{fontSize: "0.9rem", padding: "0.35rem"}}
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => setDeleteConfirm(hobby.id)}
                          title="Delete hobby"
                          style={{fontSize: "0.9rem", padding: "0.35rem"}}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                  </div>
                )}

                {viewMode === "icon" && (
                  <div className="hobbies-grid-icon">
                {hobbiesToRender.map((hobby) => (
                  <div key={hobby.id} className="hobby-icon-card">
                    <Link to={`/hobbies/${hobby.id}/items`} style={{textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center", width: "100%"}}>
                      <div className="hobby-icon-thumb">
                        <span className="hobby-icon-fallback">
                          {hobby.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="hobby-icon-name">{hobby.name}</span>
                      {hobby.category && (
                        <span className="hobby-icon-category">
                          {hobby.category}
                        </span>
                      )}
                    </Link>
                    <div className="hobby-icon-actions">
                       <button
                          className="edit-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(hobby);
                          }}
                          title="Edit hobby"
                          style={{fontSize: "0.9rem", padding: "0.3rem"}}
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(hobby.id);
                          }}
                          title="Delete hobby"
                          style={{fontSize: "0.9rem", padding: "0.3rem"}}
                        >
                          🗑️
                        </button>
                    </div>
                  </div>
                ))}
                  </div>
                )}
              </>
            )}

            {/* Details Modal */}
            {selectedHobby && (
              <div
                className="modal-overlay"
                onClick={() => setSelectedHobby(null)}
              >
                <div
                  className="modal-content details-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="details-header">
                    <h2>{selectedHobby.name}</h2>
                    <button
                      className="close-button"
                      onClick={() => setSelectedHobby(null)}
                      aria-label="Close details"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="details-body">
                    {selectedHobby.category && (
                      <div className="detail-row">
                        <span className="detail-label">Category</span>
                        <span className="detail-value badge">
                          {selectedHobby.category}
                        </span>
                      </div>
                    )}
                    
                    <div className="detail-section">
                      <h3>Description</h3>
                      <p className="detail-description">
                        {selectedHobby.description || "No description provided."}
                      </p>
                    </div>

                    {selectedHobby.tags && selectedHobby.tags.length > 0 && (
                      <div className="detail-section">
                        <h3>Tags</h3>
                        <div className="detail-tags">
                          {selectedHobby.tags.map((tag, index) => (
                            <span key={index} className="tag">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="detail-actions">
                      <Link
                        to={`/hobbies/${selectedHobby.id}/items`}
                        className="primary-action-button"
                      >
                        View All Items
                      </Link>
                      <button
                        className="secondary-action-button"
                        onClick={() => {
                          handleEdit(selectedHobby);
                          setSelectedHobby(null);
                        }}
                      >
                        Edit Hobby
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Modal */}
            {editingHobby && (
              <div className="modal-overlay" onClick={handleCancelEdit}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h2>Edit Hobby</h2>
                  <div className="form-group">
                    <label htmlFor="edit-name">Name *</label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Hobby name"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-description">Description</label>
                    <textarea
                      id="edit-description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Describe your hobby..."
                      rows={4}
                      className="form-textarea"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-category">Category</label>
                    <select
                      id="edit-category"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Auto-categorize with AI</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <p className="form-hint" style={{ fontSize: "0.85rem", color: "#888", marginTop: "0.5rem" }}>
                      Select a category manually or leave as "Auto-categorize" to let AI decide.
                    </p>

                    <label
                      htmlFor="edit-item-categories"
                      style={{ display: "block", marginTop: "0.9rem" }}
                    >
                      Item categories for this hobby (optional)
                    </label>
                    {editItemCategories.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.4rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {editItemCategories.map((cat) => (
                          <span
                            key={cat}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "999px",
                              background: "rgba(79, 70, 229, 0.25)",
                              border: "1px solid rgba(129, 140, 248, 0.7)",
                              color: "#e0e7ff",
                              fontSize: "0.8rem",
                            }}
                          >
                            {cat}
                            <button
                              type="button"
                              onClick={() =>
                                setEditItemCategories((prev) =>
                                  prev.filter((c) => c !== cat)
                                )
                              }
                              style={{
                                marginLeft: "0.35rem",
                                border: "none",
                                background: "transparent",
                                color: "#c7d2fe",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                              }}
                              aria-label={`Remove ${cat}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
                    >
                      <input
                        id="edit-item-categories"
                        type="text"
                        value={editItemCategoryDraft}
                        onChange={(e) =>
                          setEditItemCategoryDraft(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const value = editItemCategoryDraft
                              .trim()
                              .replace(/,$/, "");
                            if (!value) return;
                            setEditItemCategories((prev) =>
                              prev.includes(value) ? prev : [...prev, value]
                            );
                            setEditItemCategoryDraft("");
                          }
                        }}
                        className="form-input"
                        placeholder="Type a category and press Enter…"
                      />
                      <button
                        type="button"
                        className="camera-button"
                        style={{ whiteSpace: "nowrap" }}
                        disabled={
                          !editItemCategoryDraft.trim()
                        }
                        onClick={() => {
                          const value = editItemCategoryDraft.trim();
                          if (!value) return;
                          setEditItemCategories((prev) =>
                            prev.includes(value) ? prev : [...prev, value]
                          );
                          setEditItemCategoryDraft("");
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <p
                      className="form-hint"
                      style={{
                        fontSize: "0.85rem",
                        color: "#888",
                        marginTop: "0.5rem",
                      }}
                    >
                      Define or update custom item categories for this hobby. Separate multiple categories with commas.
                      These will be used by AI when auto-categorizing items here, even before any items exist.
                    </p>
                  </div>
                  <div className="modal-actions">
                    <button className="cancel-button" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                    <button className="save-button" onClick={handleSaveEdit}>
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
              <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
                  <h2>Delete Hobby?</h2>
                  <p>Are you sure you want to delete this hobby? This will also delete all associated items. This action cannot be undone.</p>
                  <div className="modal-actions">
                    <button className="cancel-button" onClick={() => setDeleteConfirm(null)}>
                      Cancel
                    </button>
                    <button
                      className="delete-confirm-button"
                      onClick={() => handleDelete(deleteConfirm)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Hobbies;
