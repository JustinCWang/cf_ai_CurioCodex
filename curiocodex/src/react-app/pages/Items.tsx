/**
 * Items page - View individual items within hobbies.
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
import { CATEGORIES } from "../utils/categories";
import "./Items.css";

interface Hobby {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  image_url: string | null;
  created_at: number;
  hobby_id?: string;
}

interface ItemsByHobby {
  hobby: Hobby;
  items: Item[];
}

function Items() {
  const [itemsByHobby, setItemsByHobby] = useState<ItemsByHobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState<{ item: Item; hobbyId: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ itemId: string; hobbyId: string } | null>(null);
  const { token, isAuthenticated } = useAuth();

  const fetchAllItems = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, fetch all hobbies
      const hobbiesResponse = await apiRequest("/api/hobbies", { method: "GET" }, token);
      const hobbiesData = await parseResponse<{ hobbies: Hobby[] }>(hobbiesResponse);
      
      if (hobbiesData.hobbies.length === 0) {
        setItemsByHobby([]);
        setLoading(false);
        return;
      }

      // Then, fetch items for each hobby
      const itemsPromises = hobbiesData.hobbies.map(async (hobby) => {
        try {
          const itemsResponse = await apiRequest(
            `/api/hobbies/${hobby.id}/items`,
            { method: "GET" },
            token
          );
          const itemsData = await parseResponse<{ items: Item[] }>(itemsResponse);
          return {
            hobby,
            items: itemsData.items,
          };
        } catch (err) {
          console.error(`Error fetching items for hobby ${hobby.id}:`, err);
          return {
            hobby,
            items: [],
          };
        }
      });

      const results = await Promise.all(itemsPromises);
      // Filter out hobbies with no items for cleaner display
      const withItems = results.filter((result) => result.items.length > 0);
      setItemsByHobby(withItems);
      setError("");
    } catch (err) {
      console.error("Error fetching items:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load items";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllItems();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchAllItems]);

  const handleEdit = (item: Item, hobbyId: string) => {
    setEditingItem({ item, hobbyId });
    setEditName(item.name);
    setEditDescription(item.description || "");
    setEditCategory(item.category || "");
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditName("");
    setEditDescription("");
    setEditCategory("");
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim()) {
      return;
    }

    try {
      const requestBody: { name: string; description: string | null; category?: string } = {
        name: editName.trim(),
        description: editDescription.trim() || null,
      };
      
      // Include category if manually selected (empty string means use AI)
      if (editCategory) {
        requestBody.category = editCategory;
      }

      const response = await apiRequest(
        `/api/hobbies/${editingItem.hobbyId}/items/${editingItem.item.id}`,
        {
          method: "PUT",
          body: JSON.stringify(requestBody),
        },
        token
      );
      await parseResponse(response);
      await fetchAllItems();
      handleCancelEdit();
    } catch (err) {
      console.error("Error updating item:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update item";
      setError(errorMessage);
    }
  };

  const handleDelete = async (itemId: string, hobbyId: string) => {
    try {
      const response = await apiRequest(
        `/api/hobbies/${hobbyId}/items/${itemId}`,
        { method: "DELETE" },
        token
      );
      await parseResponse(response);
      await fetchAllItems();
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting item:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete item";
      setError(errorMessage);
    }
  };

  const totalItems = itemsByHobby.reduce((sum, group) => sum + group.items.length, 0);

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Items</h1>
        <div className="page-content">
          <p>Please log in to view your items.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Items</h1>
        <div className="page-content">
          <p>Loading your items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Items</h1>
      <div className="page-content">
        <div className="items-header">
          <p>Browse items across all your hobbies.</p>
          <Link to="/add" className="add-link-button">
            📦 Add New Item
          </Link>
        </div>

        {error && <div className="error-message">{error}</div>}

        {totalItems === 0 ? (
          <div className="empty-state">
            <p className="empty-message">📦 No items yet! 📦</p>
            <p className="empty-hint">Start adding items to your hobbies.</p>
            <Link to="/add" className="add-link-button">
              Add Your First Item
            </Link>
          </div>
        ) : (
          <div className="items-container">
            {itemsByHobby.map((group) => (
              <div key={group.hobby.id} className="hobby-section">
                <div className="hobby-section-header">
                  <h2 className="hobby-section-title">
                    <Link to={`/hobbies/${group.hobby.id}/items`} className="hobby-link">
                      {group.hobby.name}
                    </Link>
                  </h2>
                  <span className="item-count">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="items-grid">
                  {group.items.map((item) => (
                    <div key={item.id} className="item-card">
                      <div className="card-glow"></div>
                      {item.image_url && (
                        <div className="item-image-container">
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            className="item-image"
                            onError={(e) => {
                              // Hide image on error
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <h3>{item.name}</h3>
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
                        <div className="action-buttons">
                          <button
                            className="edit-button"
                            onClick={() => handleEdit(item, group.hobby.id)}
                            title="Edit item"
                          >
                            ✏️
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => setDeleteConfirm({ itemId: item.id, hobbyId: group.hobby.id })}
                            title="Delete item"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingItem && (
          <div className="modal-overlay" onClick={handleCancelEdit}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Edit Item</h2>
              <div className="form-group">
                <label htmlFor="edit-item-name">Name *</label>
                <input
                  id="edit-item-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Item name"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-item-description">Description</label>
                <textarea
                  id="edit-item-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Describe your item..."
                  rows={4}
                  className="form-textarea"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-item-category">Category</label>
                <select
                  id="edit-item-category"
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
              <h2>Delete Item?</h2>
              <p>Are you sure you want to delete this item? This action cannot be undone.</p>
              <div className="modal-actions">
                <button className="cancel-button" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button
                  className="delete-confirm-button"
                  onClick={() => handleDelete(deleteConfirm.itemId, deleteConfirm.hobbyId)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Items;

