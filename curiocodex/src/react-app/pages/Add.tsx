/**
 * Add page - Create new hobbies or items.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
import "./Add.css";

interface Hobby {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
}

function Add() {
  const [type, setType] = useState<"hobby" | "item">("hobby");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedHobbyId, setSelectedHobbyId] = useState("");
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  const fetchHobbies = useCallback(async () => {
    try {
      const response = await apiRequest("/api/hobbies", { method: "GET" }, token);
      const data = await parseResponse<{ hobbies: Hobby[] }>(response);
      setHobbies(data.hobbies);
      setSelectedHobbyId((prev) => {
        // Only set if we don't have a selection yet and there are hobbies available
        if (!prev && data.hobbies.length > 0) {
          return data.hobbies[0].id;
        }
        return prev;
      });
    } catch (err) {
      console.error("Error fetching hobbies:", err);
      setError("Failed to load hobbies");
    }
  }, [token]);

  // Fetch hobbies when component mounts and when type changes to "item"
  useEffect(() => {
    if (isAuthenticated && type === "item") {
      fetchHobbies();
    }
  }, [type, isAuthenticated, fetchHobbies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!name.trim()) {
      setError("Name is required");
      setLoading(false);
      return;
    }

    if (type === "item" && !selectedHobbyId) {
      setError("Please select a hobby");
      setLoading(false);
      return;
    }

    try {
      if (type === "hobby") {
        // Create hobby
        const response = await apiRequest(
          "/api/hobbies",
          {
            method: "POST",
            body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
          },
          token
        );

        const data = await parseResponse<{ success: boolean; hobby: Hobby }>(response);
        
        if (data.success) {
          setSuccess(`Hobby "${data.hobby.name}" created successfully!`);
          setName("");
          setDescription("");
          // Redirect to hobbies page after 1.5 seconds
          setTimeout(() => {
            navigate("/hobbies");
          }, 1500);
        }
      } else {
        // Create item
        const response = await apiRequest(
          `/api/hobbies/${selectedHobbyId}/items`,
          {
            method: "POST",
            body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
          },
          token
        );

        const data = await parseResponse<{ success: boolean; item: Item }>(response);
        
        if (data.success) {
          const hobbyName = hobbies.find(h => h.id === selectedHobbyId)?.name || "hobby";
          setSuccess(`Item "${data.item.name}" added to ${hobbyName} successfully!`);
          setName("");
          setDescription("");
          // Redirect to items page after 1.5 seconds
          setTimeout(() => {
            navigate("/items");
          }, 1500);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Add New</h1>
        <div className="page-content">
          <p>Please log in to add hobbies or items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Add New</h1>
      <div className="page-content">
        <div className="add-form-container">
          <div className="type-selector">
            <button
              type="button"
              className={`type-button ${type === "hobby" ? "active" : ""}`}
              onClick={() => {
                setType("hobby");
                setError("");
                setSuccess("");
              }}
            >
              ✨ Hobby
            </button>
            <button
              type="button"
              className={`type-button ${type === "item" ? "active" : ""}`}
              onClick={() => {
                setType("item");
                setError("");
                setSuccess("");
              }}
            >
              📦 Item
            </button>
          </div>

          <form onSubmit={handleSubmit} className="add-form">
            {type === "item" && (
              <div className="form-group">
                <label htmlFor="hobby">Select Hobby *</label>
                <select
                  id="hobby"
                  value={selectedHobbyId}
                  onChange={(e) => setSelectedHobbyId(e.target.value)}
                  disabled={loading || hobbies.length === 0}
                  required
                  className="form-select"
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
                {hobbies.length === 0 && (
                  <p className="form-hint">
                    You need to create a hobby first before adding items.
                  </p>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                placeholder={`Enter ${type} name...`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="form-input"
              />
              <p className="form-hint">
                AI will automatically categorize and tag your {type} based on the name and description.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                placeholder={`Describe your ${type}...`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={4}
                className="form-textarea"
              />
              <p className="form-hint">
                Optional. A detailed description helps AI generate better tags and categorization.
              </p>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="submit-button" disabled={loading || (type === "item" && hobbies.length === 0)}>
              {loading ? (
                <>✨ Creating...</>
              ) : (
                <>✨ Create {type === "hobby" ? "Hobby" : "Item"}</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Add;

