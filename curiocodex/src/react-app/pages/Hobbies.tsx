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

function Hobbies() {
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingHobby, setEditingHobby] = useState<Hobby | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editItemCategories, setEditItemCategories] = useState<string[]>([]);
  const [editItemCategoryDraft, setEditItemCategoryDraft] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
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
          <>
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
                    <div className="card-actions">
                      <Link to={`/hobbies/${hobby.id}/items`} className="view-items-link">
                        View Items →
                      </Link>
                      <div className="action-buttons">
                        <button
                          className="edit-button"
                          onClick={() => handleEdit(hobby)}
                          title="Edit hobby"
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => setDeleteConfirm(hobby.id)}
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

