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
  const [editingHobby, setEditingHobby] = useState<Hobby | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
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

  const handleEdit = (hobby: Hobby) => {
    setEditingHobby(hobby);
    setEditName(hobby.name);
    setEditDescription(hobby.description || "");
  };

  const handleCancelEdit = () => {
    setEditingHobby(null);
    setEditName("");
    setEditDescription("");
  };

  const handleSaveEdit = async () => {
    if (!editingHobby || !editName.trim()) {
      return;
    }

    try {
      const response = await apiRequest(
        `/api/hobbies/${editingHobby.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: editName.trim(),
            description: editDescription.trim() || null,
          }),
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

