/**
 * AddHobby page - Create a new hobby.
 * Dedicated flow for adding a single hobby with optional AI-assisted metadata.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
import { CATEGORIES } from "../utils/categories";
import "./Add.css";

interface Hobby {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
}

function AddHobby() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualCategory, setManualCategory] = useState<string>("");
  const [hobbyItemCategories, setHobbyItemCategories] = useState<string[]>([]);
  const [hobbyItemCategoryDraft, setHobbyItemCategoryDraft] =
    useState<string>("");

  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  /**
   * Submit handler for creating a new hobby.
   * Sends hobby metadata to the API and redirects back to the Hobbies page.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const requestBody: {
        name: string;
        description: string | null;
        category?: string;
        itemCategories?: string[];
      } = {
        name: name.trim(),
        description: description.trim() || null,
      };

      // Include category if manually selected
      if (manualCategory) {
        requestBody.category = manualCategory;
      }

      // Optional: include any initial item categories for this hobby
      if (hobbyItemCategories.length > 0) {
        requestBody.itemCategories = hobbyItemCategories;
      }

      const response = await apiRequest(
        "/api/hobbies",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        },
        token
      );

      const data = await parseResponse<{ success: boolean; hobby: Hobby }>(
        response
      );

      if (data.success) {
        setSuccess(`Hobby "${data.hobby.name}" created successfully!`);
        setName("");
        setDescription("");
        setManualCategory("");
        setHobbyItemCategories([]);
        setHobbyItemCategoryDraft("");
        setShowAdvanced(false);

        // Redirect to hobbies page after a short delay
        setTimeout(() => {
          navigate("/hobbies");
        }, 1200);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create hobby.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Add Hobby</h1>
        <div className="page-content">
          <p>Please log in to add hobbies.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Add Hobby</h1>
      <div className="page-content">
        <div className="add-form-container">
          <form onSubmit={handleSubmit} className="add-form">
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                placeholder="Enter hobby name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="form-input"
              />
              <p className="form-hint">
                AI will automatically categorize and tag your hobby based on the
                name and description.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                placeholder="Describe your hobby..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={4}
                className="form-textarea"
              />
              <p className="form-hint">
                Optional. A detailed description helps AI generate better tags
                and categorization.
              </p>
            </div>

            {/* Advanced Options */}
            <div className="advanced-section">
              <button
                type="button"
                className="advanced-toggle"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? "▼" : "▶"} Advanced Options
              </button>
              {showAdvanced && (
                <div className="advanced-content">
                  <div className="form-group">
                    <label htmlFor="category">Category</label>
                    <select
                      id="category"
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      disabled={loading}
                      className="form-select"
                    >
                      <option value="">Auto-categorize with AI</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <p className="form-hint">
                      Select a high-level hobby category manually, or leave on
                      auto to let AI pick one.
                    </p>

                    <label
                      htmlFor="hobby-item-categories"
                      style={{ display: "block", marginTop: "0.9rem" }}
                    >
                      Item categories for this hobby (optional)
                    </label>
                    {hobbyItemCategories.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.4rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {hobbyItemCategories.map((cat) => (
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
                                setHobbyItemCategories((prev) =>
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
                        id="hobby-item-categories"
                        type="text"
                        value={hobbyItemCategoryDraft}
                        onChange={(e) =>
                          setHobbyItemCategoryDraft(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const value = hobbyItemCategoryDraft
                              .trim()
                              .replace(/,$/, "");
                            if (!value) return;
                            setHobbyItemCategories((prev) =>
                              prev.includes(value) ? prev : [...prev, value]
                            );
                            setHobbyItemCategoryDraft("");
                          }
                        }}
                        disabled={loading}
                        className="form-input"
                        placeholder="Type a category and press Enter…"
                      />
                      <button
                        type="button"
                        className="camera-button"
                        style={{ whiteSpace: "nowrap" }}
                        disabled={loading || !hobbyItemCategoryDraft.trim()}
                        onClick={() => {
                          const value = hobbyItemCategoryDraft.trim();
                          if (!value) return;
                          setHobbyItemCategories((prev) =>
                            prev.includes(value) ? prev : [...prev, value]
                          );
                          setHobbyItemCategoryDraft("");
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <p className="form-hint">
                      Define custom item categories ahead of time. These will be
                      used by AI when auto-categorizing new items in this
                      hobby.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? <>✨ Creating...</> : <>✨ Create Hobby</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddHobby;


