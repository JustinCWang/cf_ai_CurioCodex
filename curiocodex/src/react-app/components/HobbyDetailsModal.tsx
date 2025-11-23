/**
 * Modal component for showing full details about a single hobby.
 * Used by the Hobbies page when a hobby card is expanded.
 */

import { Link } from "react-router-dom";

interface HobbyDetailsModalProps {
  hobby: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    tags: string[];
  };
  /** Close the modal without taking further action. */
  onClose: () => void;
  /** Trigger edit flow for the hobby, then close the modal. */
  onEdit: () => void;
}

function HobbyDetailsModal({ hobby, onClose, onEdit }: HobbyDetailsModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="details-header">
          <h2>{hobby.name}</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close details"
          >
            ×
          </button>
        </div>

        <div className="details-body">
          {hobby.category && (
            <div className="detail-row">
              <span className="detail-label">Category</span>
              <span className="detail-value badge">{hobby.category}</span>
            </div>
          )}

          <div className="detail-section">
            <h3>Description</h3>
            <p className="detail-description">
              {hobby.description || "No description provided."}
            </p>
          </div>

          {hobby.tags && hobby.tags.length > 0 && (
            <div className="detail-section">
              <h3>Tags</h3>
              <div className="detail-tags">
                {hobby.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-actions">
            <Link
              to={`/hobbies/${hobby.id}/items`}
              className="primary-action-button"
            >
              View All Items
            </Link>
            <button
              className="secondary-action-button"
              onClick={onEdit}
            >
              Edit Hobby
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HobbyDetailsModal;


