/**
 * Activity page - Shows a running list of the user's recent activity.
 * Uses the backend activity feed to display newly created hobbies and items,
 * with multiple layout modes and simple pagination.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
import ViewToggle, { type ViewMode } from "../components/ViewToggle";

type ActivityEvent =
  | {
      id: string;
      type: "hobby_created";
      created_at: number;
      hobby: {
        id: string;
        name: string;
        description: string | null;
        category: string | null;
        tags: string[];
      };
    }
  | {
      id: string;
      type: "item_created";
      created_at: number;
      hobby: {
        id: string;
        name: string;
      };
      item: {
        id: string;
        name: string;
        description: string | null;
        category: string | null;
        tags: string[];
      };
    };

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Activity() {
  const { token, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  // Adjust page size when the user changes the view mode so each layout
  // shows a reasonable amount of activity per page.
  useEffect(() => {
    if (viewMode === "card") {
      setPageSize(5);
    } else if (viewMode === "list") {
      setPageSize(10);
    } else {
      setPageSize(10);
    }
    setPage(1);
  }, [viewMode]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchActivity = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest(
          `/api/activity/recent?page=${page}&pageSize=${pageSize}`,
          { method: "GET" },
          token
        );

        const data = await parseResponse<{
          events: ActivityEvent[];
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
        }>(response);

        setEvents(data.events || []);
        setPage(data.page ?? page);
        setPageSize(data.pageSize ?? pageSize);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (err) {
        console.error("Error loading recent activity:", err);
        const message =
          err instanceof Error ? err.message : "Failed to load recent activity";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [isAuthenticated, token, page, pageSize]);

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Recent Activity</h1>
        <div className="page-content">
          <p>Please log in to see your recent activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Recent Activity</h1>
      <div className="page-content">
        <div className="discover-header">
          <p>See what you&apos;ve recently added to your collection.</p>
          <p className="discover-hint">
            New hobbies and items appear here in reverse chronological order.
          </p>
        </div>

        {!loading && !error && (
          <div className="activity-toolbar">
            <div className="activity-toolbar-summary">
              <span>
                Showing {events.length} of {total} event
                {total !== 1 ? "s" : ""} · Page {page} of {totalPages}
              </span>
            </div>
            <div className="activity-toolbar-controls">
              <div className="activity-view-toggle">
                <ViewToggle
                  mode={viewMode}
                  onChange={setViewMode}
                  ariaLabel="Change activity layout"
                  labels={{
                    card: "Detailed",
                    list: "List",
                  }}
                  showIcon={false}
                />
              </div>
              <div className="activity-pagination">
                <button
                  type="button"
                  className="activity-page-button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  ‹ Prev
                </button>
                <span className="activity-page-info">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="activity-page-button"
                  onClick={() =>
                    setPage((p) => (p < totalPages ? p + 1 : p))
                  }
                  disabled={page >= totalPages || loading}
                >
                  Next ›
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="empty-state">
            <p className="empty-message">✨ Loading your recent activity...</p>
            <p className="empty-hint">
              We&apos;re fetching the latest changes to your collection.
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="error-message">{error}</div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="empty-state">
            <p className="empty-message">No activity yet</p>
            <p className="empty-hint">
              Start by creating a hobby or adding an item, and your actions will
              appear here.
            </p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <>
            {viewMode === "card" ? (
              <div className="activity-timeline">
                {events.map((event) => (
                  <div key={event.id} className="activity-entry result-card">
                    <div className="card-glow"></div>
                    <div className="activity-entry-header">
                      <span className="activity-type">
                        {event.type === "hobby_created"
                          ? "New hobby added"
                          : "New item added"}
                      </span>
                      <span className="activity-timestamp">
                        {formatTimestamp(event.created_at)}
                      </span>
                    </div>

                    {event.type === "hobby_created" ? (
                      <div className="activity-body">
                        <h4>{event.hobby.name}</h4>
                        {event.hobby.description && (
                          <p className="card-description">
                            {event.hobby.description}
                          </p>
                        )}
                        <div className="card-category">
                          <span className="category-label">Type:</span>
                          <span className="category-value">Hobby</span>
                        </div>
                        {event.hobby.category && (
                          <div className="card-category">
                            <span className="category-label">Category:</span>
                            <span className="category-value">
                              {event.hobby.category}
                            </span>
                          </div>
                        )}
                        {event.hobby.tags && event.hobby.tags.length > 0 && (
                          <div className="card-tags">
                            {event.hobby.tags.slice(0, 4).map((tag, index) => (
                              <span key={index} className="tag">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="activity-body">
                        <h4>{event.item.name}</h4>
                        {event.item.description && (
                          <p className="card-description">
                            {event.item.description}
                          </p>
                        )}
                        <div className="card-category">
                          <span className="category-label">Type:</span>
                          <span className="category-value">Item</span>
                        </div>
                        <div className="card-category">
                          <span className="category-label">Hobby:</span>
                          <span className="category-value">
                            {event.hobby.name}
                          </span>
                        </div>
                        {event.item.category && (
                          <div className="card-category">
                            <span className="category-label">Category:</span>
                            <span className="category-value">
                              {event.item.category}
                            </span>
                          </div>
                        )}
                        {event.item.tags && event.item.tags.length > 0 && (
                          <div className="card-tags">
                            {event.item.tags.slice(0, 4).map((tag, index) => (
                              <span key={index} className="tag">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="activity-list">
                {events.map((event) => {
                  const isHobby = event.type === "hobby_created";
                  const title = isHobby ? event.hobby.name : event.item.name;
                  const subtitle = isHobby
                    ? event.hobby.category || "Hobby"
                    : event.item.category || "Item";

                  return (
                    <div key={event.id} className="activity-list-row">
                      <div className="activity-list-main">
                        <span
                          className={`activity-type-badge ${
                            isHobby ? "hobby" : "item"
                          }`}
                        >
                          {isHobby ? "Hobby" : "Item"}
                        </span>
                        <span className="activity-list-title">{title}</span>
                        {!isHobby && (
                          <span className="activity-list-hobby">
                            in {event.hobby.name}
                          </span>
                        )}
                      </div>
                      <div className="activity-list-meta">
                        <span className="activity-list-subtitle">
                          {subtitle}
                        </span>
                        <span className="activity-timestamp">
                          {formatTimestamp(event.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Activity;
