/**
 * Items page - View individual items within hobbies.
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
import "./Items.css";

interface Hobby {
  id: string;
  name: string;
  category?: string | null;
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
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState<{ item: Item; hobbyId: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editHobbyId, setEditHobbyId] = useState<string>("");
  const [editHobbyCategory, setEditHobbyCategory] = useState<string | null>(null);
  const [editItemCategories, setEditItemCategories] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ itemId: string; hobbyId: string } | null>(null);
  const [testHobbyId, setTestHobbyId] = useState<string>("");
  const [testHobbyCategory, setTestHobbyCategory] = useState<string | null>(null);
  const [testItemCategories, setTestItemCategories] = useState<string[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState("");
  const { token, isAuthenticated } = useAuth();

  const fetchAllItems = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, fetch all hobbies
      const hobbiesResponse = await apiRequest("/api/hobbies", { method: "GET" }, token);
      const hobbiesData = await parseResponse<{ hobbies: Hobby[] }>(hobbiesResponse);

      setHobbies(hobbiesData.hobbies);

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

  const fetchEditCategories = useCallback(
    async (hobbyId: string) => {
      if (!hobbyId) {
        setEditHobbyCategory(null);
        setEditItemCategories([]);
        return;
      }

      try {
        const response = await apiRequest(
          `/api/hobbies/${hobbyId}/item-categories`,
          { method: "GET" },
          token
        );
        const data = await parseResponse<{
          hobbyCategory: string | null;
          itemCategories: string[];
        }>(response);
        setEditHobbyCategory(data.hobbyCategory);
        setEditItemCategories(data.itemCategories);
      } catch (err) {
        console.error("Error fetching item categories for edit modal:", err);
        setEditHobbyCategory(null);
        setEditItemCategories([]);
      }
    },
    [token]
  );

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllItems();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchAllItems]);

  const fetchTestCategories = useCallback(
    async (hobbyId: string) => {
      if (!hobbyId) {
        setTestHobbyCategory(null);
        setTestItemCategories([]);
        setTestError("");
        return;
      }

      try {
        setTestLoading(true);
        setTestError("");
        const response = await apiRequest(
          `/api/hobbies/${hobbyId}/item-categories`,
          { method: "GET" },
          token
        );
        const data = await parseResponse<{
          hobbyCategory: string | null;
          itemCategories: string[];
        }>(response);
        setTestHobbyCategory(data.hobbyCategory);
        setTestItemCategories(data.itemCategories);
      } catch (err) {
        console.error("Error fetching categories for tester:", err);
        const message =
          err instanceof Error ? err.message : "Failed to load categories";
        setTestError(message);
        setTestHobbyCategory(null);
        setTestItemCategories([]);
      } finally {
        setTestLoading(false);
      }
    },
    [token]
  );

  const handleEdit = async (item: Item, hobbyId: string) => {
    setEditingItem({ item, hobbyId });
    setEditName(item.name);
    setEditDescription(item.description || "");
    setEditCategory(item.category || "");
    setEditHobbyId(hobbyId);
    await fetchEditCategories(hobbyId);
  };

  // When the target hobby changes in the edit modal, refresh the available item categories
  useEffect(() => {
    if (editingItem && editHobbyId) {
      fetchEditCategories(editHobbyId);
    }
  }, [editingItem, editHobbyId, fetchEditCategories]);

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditName("");
    setEditDescription("");
    setEditCategory("");
    setEditHobbyId("");
    setEditHobbyCategory(null);
    setEditItemCategories([]);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim()) {
      return;
    }

    try {
      const originalHobbyId = editingItem.hobbyId;
      const targetHobbyId = editHobbyId || originalHobbyId;

      const requestBody: { name: string; description: string | null; category?: string } = {
        name: editName.trim(),
        description: editDescription.trim() || null,
      };
      
      // Include category if manually selected (empty string means use AI)
      if (editCategory) {
        requestBody.category = editCategory;
      }

      // First, update the item fields under its current hobby
      const response = await apiRequest(
        `/api/hobbies/${originalHobbyId}/items/${editingItem.item.id}`,
        {
          method: "PUT",
          body: JSON.stringify(requestBody),
        },
        token
      );
      await parseResponse(response);

      // If the hobby changed, move the item to the new hobby
      if (targetHobbyId !== originalHobbyId) {
        const moveResponse = await apiRequest(
          `/api/hobbies/${originalHobbyId}/items/${editingItem.item.id}/move`,
          {
            method: "PUT",
            body: JSON.stringify({ newHobbyId: targetHobbyId }),
          },
          token
        );
        await parseResponse(moveResponse);
      }
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

        {/* Category testing panel */}
        {hobbies.length > 0 && (
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem 1.25rem",
              borderRadius: "0.75rem",
              background: "rgba(15, 15, 35, 0.85)",
              border: "1px solid rgba(148, 163, 255, 0.4)",
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.7)",
            }}
          >
            <h2
              style={{
                margin: "0 0 0.75rem 0",
                fontSize: "1.05rem",
                fontWeight: 600,
              }}
            >
              Category Tester
            </h2>
            <p
              style={{
                margin: "0 0 0.75rem 0",
                fontSize: "0.85rem",
                color: "#9ca3af",
              }}
            >
              Pick a hobby to see its main category and all item categories that
              are currently in use. New items will inherit the hobby category
              when you leave the item category empty.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <label
                htmlFor="category-tester-hobby"
                style={{ fontSize: "0.9rem" }}
              >
                Hobby:
              </label>
              <select
                id="category-tester-hobby"
                value={testHobbyId}
                onChange={(e) => {
                  const value = e.target.value;
                  setTestHobbyId(value);
                  fetchTestCategories(value);
                }}
                className="form-input"
                style={{ maxWidth: "260px" }}
              >
                <option value="">Select a hobby…</option>
                {hobbies.map((hobby) => (
                  <option key={hobby.id} value={hobby.id}>
                    {hobby.name}
                  </option>
                ))}
              </select>
              {testLoading && (
                <span style={{ fontSize: "0.85rem", color: "#a5b4fc" }}>
                  Loading categories…
                </span>
              )}
            </div>

            {testError && (
              <div className="error-message" style={{ marginBottom: "0.75rem" }}>
                {testError}
              </div>
            )}

            {testHobbyId && !testError && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "#e5e7eb",
                      marginRight: "0.35rem",
                    }}
                  >
                    Hobby category:
                  </span>
                  <span style={{ color: "#c4b5fd" }}>
                    {testHobbyCategory && testHobbyCategory.trim()
                      ? testHobbyCategory
                      : "None (AI / uncategorized)"}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "#e5e7eb",
                      marginRight: "0.35rem",
                    }}
                  >
                    Item categories in this hobby:
                  </span>
                  {testItemCategories.length === 0 ? (
                    <span style={{ color: "#9ca3af" }}>
                      None yet. When you add items and set custom categories,
                      they will appear here and be reused for auto-categorization.
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        flexWrap: "wrap",
                        gap: "0.35rem",
                      }}
                    >
                      {testItemCategories.map((cat) => (
                        <span
                          key={cat}
                          style={{
                            padding: "0.15rem 0.45rem",
                            borderRadius: "999px",
                            background: "rgba(79, 70, 229, 0.25)",
                            border: "1px solid rgba(129, 140, 248, 0.7)",
                            color: "#e0e7ff",
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
                <label htmlFor="edit-item-hobby">Hobby</label>
                <select
                  id="edit-item-hobby"
                  value={editHobbyId}
                  onChange={(e) => setEditHobbyId(e.target.value)}
                  className="form-input"
                >
                  {hobbies.map((hobby) => (
                    <option key={hobby.id} value={hobby.id}>
                      {hobby.name}
                    </option>
                  ))}
                </select>
                <p className="form-hint" style={{ fontSize: "0.85rem", color: "#888", marginTop: "0.5rem" }}>
                  Move this item to a different hobby, or keep it in the current one.
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="edit-item-category">Category</label>
                <input
                  id="edit-item-category"
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="form-input"
                  list="edit-item-category-options"
                  placeholder={
                    editHobbyCategory
                      ? `Leave empty to use the hobby category (${editHobbyCategory}), or type a custom item category`
                      : "Leave empty to let AI use the hobby category or type a custom item category"
                  }
                />
                <datalist id="edit-item-category-options">
                  {editItemCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                <p
                  className="form-hint"
                  style={{
                    fontSize: "0.85rem",
                    color: "#888",
                    marginTop: "0.5rem",
                  }}
                >
                  Start typing to create a new item category, or pick from your previously used item categories. Leave empty to inherit the hobby&apos;s category by default.
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

