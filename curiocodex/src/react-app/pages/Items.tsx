/**
 * Items page - View and manage individual items within hobbies.
 * Supports grouping by hobby, search, filters, multiple layouts, and item editing.
 */

import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
import ViewToggle from "../components/ViewToggle";
import ItemDetailsModal from "../components/ItemDetailsModal";
import ConfirmModal from "../components/ConfirmModal";
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

interface SearchItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  created_at: number;
  hobby_id: string;
  similarity?: number;
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
  const [viewMode, setViewMode] = useState<"card" | "list" | "icon">("card");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Text-based search only for items; semantic search lives on the Discover page.
  const [searchMode] = useState<"semantic" | "text">("text");
  const [searchItems, setSearchItems] = useState<SearchItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchMethod, setSearchMethod] = useState<"semantic" | "text" | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterHobbyId, setFilterHobbyId] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const { hobbyId } = useParams<{ hobbyId?: string }>();
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

  const handleItemSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = searchQuery.trim();
      if (!trimmed) {
        // Clear search and show normal grouped view
        setHasSearched(false);
        setSearchItems(null);
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
          items: SearchItem[];
          searchMethod: "semantic" | "text";
        }>(response);

        setSearchItems(data.items || []);
        setSearchMethod(data.searchMethod);
      } catch (err) {
        console.error("Error searching items:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search items";
        setSearchError(errorMessage);
        setSearchItems(null);
        setSearchMethod(null);
      } finally {
        setSearchLoading(false);
      }
    },
    [searchQuery, searchMode, token]
  );

  // Determine which hobby is "active" for filter and category purposes
  const activeHobbyIdForFilters =
    hobbyId || (filterHobbyId !== "all" ? filterHobbyId : null);

  // Build category list scoped to the active hobby when present, or all hobbies otherwise
  const categorySet = new Set<string>();
  if (activeHobbyIdForFilters) {
    const group = itemsByHobby.find((g) => g.hobby.id === activeHobbyIdForFilters);
    if (group) {
      group.items.forEach((item) => {
        if (item.category && item.category.trim()) {
          categorySet.add(item.category.trim());
        }
      });
    }
  } else {
    itemsByHobby.forEach((group) => {
      group.items.forEach((item) => {
        if (item.category && item.category.trim()) {
          categorySet.add(item.category.trim());
        }
      });
    });
  }
  const allCategories = Array.from(categorySet).sort((a, b) =>
    a.localeCompare(b)
  );

  // Ensure selected category stays valid when the active hobby (and its categories)
  // change due to route (/hobbies/:id/items) or hobby filter dropdown.
  useEffect(() => {
    if (filterCategory === "all") return;
    if (!allCategories.includes(filterCategory)) {
      setFilterCategory("all");
    }
  }, [allCategories, filterCategory]);

  // Filter items by route hobby (if present) and UI filters
  let filteredGroups: ItemsByHobby[] = itemsByHobby.filter((group) => {
    // If we're on /hobbies/:hobbyId/items, always lock to that hobby
    if (hobbyId && group.hobby.id !== hobbyId) return false;
    // Otherwise respect the hobby filter dropdown
    if (!hobbyId && filterHobbyId !== "all" && group.hobby.id !== filterHobbyId)
      return false;
    return true;
  });

  if (filterCategory !== "all") {
    filteredGroups = filteredGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => item.category && item.category === filterCategory
        ),
      }))
      .filter((group) => group.items.length > 0);
  }

  const isSearching = hasSearched && !!searchQuery.trim();

  let searchGroups: ItemsByHobby[] = [];
  if (isSearching && searchItems) {
    const hobbiesById = new Map(hobbies.map((h) => [h.id, h]));
    const byHobby = new Map<string, ItemsByHobby>();

    searchItems.forEach((result) => {
      // Respect route hobby filter if present
      if (hobbyId && result.hobby_id !== hobbyId) {
        return;
      }
      // Otherwise apply hobby filter dropdown
      if (!hobbyId && filterHobbyId !== "all" && result.hobby_id !== filterHobbyId) {
        return;
      }

      const existing = byHobby.get(result.hobby_id);
      if (!existing) {
        const hobbyMeta = hobbiesById.get(result.hobby_id);
        const hobby: Hobby = {
          id: result.hobby_id,
          name: hobbyMeta?.name || "Unknown Hobby",
          category: hobbyMeta?.category ?? null,
        };
        byHobby.set(result.hobby_id, {
          hobby,
          items: [],
        });
      }

      const group = byHobby.get(result.hobby_id)!;
      group.items.push({
        id: result.id,
        name: result.name,
        description: result.description,
        category: result.category,
        tags: result.tags || [],
        image_url: null,
        created_at: result.created_at,
        hobby_id: result.hobby_id,
      });
    });

    let groups = Array.from(byHobby.values());

    if (filterCategory !== "all") {
      groups = groups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) => item.category && item.category === filterCategory
          ),
        }))
        .filter((group) => group.items.length > 0);
    }

    searchGroups = groups;
  }

  const groupsToRender: ItemsByHobby[] = isSearching ? searchGroups : filteredGroups;

  const totalItems = groupsToRender.reduce(
    (sum, group) => sum + group.items.length,
    0
  );

  const activeHobbyId =
    hobbyId || (filterHobbyId !== "all" ? filterHobbyId : null);
  const activeHobby =
    activeHobbyId && hobbies.length > 0
      ? hobbies.find((h) => h.id === activeHobbyId) || null
      : null;

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
          <p>
            {activeHobby
              ? `Browse items in "${activeHobby.name}".`
              : "Browse items across all your hobbies."}
          </p>
          <Link to="/add/item" className="add-link-button">
            📦 Add New Item
          </Link>
        </div>

        {/* Item search (text-based) */}
        <form onSubmit={handleItemSearch} className="items-search-form">
          <div className="items-search-input-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your items..."
              className="items-search-input"
              disabled={searchLoading}
            />
            <button
              type="submit"
              className="items-search-button"
              disabled={searchLoading}
            >
              {searchLoading ? "🔍 Searching..." : "🔍 Search"}
            </button>
            {isSearching && (
              <button
                type="button"
                className="items-search-clear"
                onClick={() => {
                  setSearchQuery("");
                  setSearchItems(null);
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

        {/* Filters */}
        <div className="items-filters">
          <div className="items-filter-group">
            <label className="items-filter-label">Hobby</label>
            {hobbyId ? (
              <div className="items-filter-value">
                {activeHobby ? activeHobby.name : "This hobby"}
              </div>
            ) : (
              <select
                className="items-filter-select"
                value={filterHobbyId}
                onChange={(e) => setFilterHobbyId(e.target.value)}
              >
                <option value="all">All hobbies</option>
                {hobbies.map((hobby) => (
                  <option key={hobby.id} value={hobby.id}>
                    {hobby.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="items-filter-group">
            <label className="items-filter-label">Category</label>
            <select
              className="items-filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="items-toolbar">
          <div className="items-toolbar-summary">
            <span className="items-total">
              {totalItems} item{totalItems !== 1 ? "s" : ""} across{" "}
              {filteredGroups.length} hobbie
              {filteredGroups.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="items-view-toggle">
            <ViewToggle
              mode={viewMode}
              onChange={setViewMode}
              ariaLabel="Change item layout"
              labels={{ card: "Column", list: "List", icon: "Icon" }}
            />
          </div>
        </div>

        {totalItems === 0 ? (
          <div className="empty-state">
            <p className="empty-message">📦 No items yet! 📦</p>
            <p className="empty-hint">Start adding items to your hobbies.</p>
            <Link to="/add/item" className="add-link-button">
              Add Your First Item
            </Link>
          </div>
        ) : (
          <>
            {isSearching && (
              <div className="items-search-summary">
                <span>
                  Showing {totalItems} item{totalItems !== 1 ? "s" : ""}{" "}
                  {activeHobby
                    ? `in "${activeHobby.name}"`
                    : "across your hobbies"}
                  {searchMethod
                    ? ` · ${searchMethod === "semantic" ? "Semantic" : "Text"} search`
                    : ""}
                </span>
              </div>
            )}

            <div className="items-container">
              {groupsToRender.map((group) => (
                <div key={group.hobby.id} className="hobby-section">
                <div className="hobby-section-header">
                  <h2 className="hobby-section-title">
                    <Link to={`/hobbies/${group.hobby.id}/items`} className="hobby-link">
                      {group.hobby.name}
                    </Link>
                  </h2>
                  <span className="item-count">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</span>
                </div>
                {viewMode === "card" && (
                  <div className="items-grid items-grid-card">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="item-card"
                        onClick={() => setSelectedItem(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedItem(item);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="card-glow"></div>
                        <h3>{item.name}</h3>
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
                          <div className="action-buttons">
                            <button
                              className="edit-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(item, group.hobby.id);
                              }}
                              title="Edit item"
                            >
                              ✏️
                            </button>
                            <button
                              className="delete-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({
                                  itemId: item.id,
                                  hobbyId: group.hobby.id,
                                });
                              }}
                              title="Delete item"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {viewMode === "list" && (
                  <div className="items-list" aria-label="Items list view">
                    {group.items.map((item) => (
                      <div key={item.id} className="item-row">
                        <div className="item-row-main">
                          <div className="item-row-primary">
                            <span className="item-row-name">{item.name}</span>
                            {item.category && (
                              <span className="item-row-category">
                                {item.category}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="item-row-description">
                              {item.description}
                            </div>
                          )}
                        </div>
                        <div className="item-row-meta">
                          {item.tags && item.tags.length > 0 && (
                            <div className="item-row-tags">
                              {item.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="item-row-tag">
                                  #{tag}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="item-row-tag-more">
                                  +{item.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                          <div className="item-row-actions">
                            <button
                              className="edit-button"
                              onClick={() => handleEdit(item, group.hobby.id)}
                              title="Edit item"
                            >
                              ✏️
                            </button>
                            <button
                              className="delete-button"
                              onClick={() =>
                                setDeleteConfirm({
                                  itemId: item.id,
                                  hobbyId: group.hobby.id,
                                })
                              }
                              title="Delete item"
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
                  <div className="items-grid items-grid-icon">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="item-icon-card"
                        onClick={() => handleEdit(item, group.hobby.id)}
                        title={`Edit ${item.name}`}
                      >
                        <div className="item-icon-thumb">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="item-icon-image"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <span className="item-icon-fallback">
                              {item.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="item-icon-name">{item.name}</span>
                        {item.category && (
                          <span className="item-icon-category">
                            {item.category}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Details Modal */}
        {selectedItem && (
          <ItemDetailsModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onEdit={() => {
              // Try to use hobby_id from the item first, then fall back to grouping lookup.
              let hid = selectedItem.hobby_id;
              if (!hid) {
                const group = itemsByHobby.find((g) =>
                  g.items.some((i) => i.id === selectedItem.id)
                );
                if (group) hid = group.hobby.id;
              }

              if (hid) {
                handleEdit(selectedItem, hid);
                setSelectedItem(null);
              }
            }}
          />
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
          <ConfirmModal
            title="Delete Item?"
            message="Are you sure you want to delete this item? This action cannot be undone."
            confirmLabel="Delete"
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={() =>
              handleDelete(deleteConfirm.itemId, deleteConfirm.hobbyId)
            }
          />
        )}
      </div>
    </div>
  );
}

export default Items;

