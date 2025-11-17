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
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
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
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Items;

