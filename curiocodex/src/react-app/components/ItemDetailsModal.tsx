/**
 * Modal component for showing full details about a single item.
 * Used by the Items page when an item card is expanded.
 */

interface ItemDetailsModalProps {
  item: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    tags: string[];
    image_url: string | null;
  };
  /** Close the modal without taking further action. */
  onClose: () => void;
  /** Trigger edit flow for the item, then close the modal. */
  onEdit: () => void;
}

function ItemDetailsModal({ item, onClose, onEdit }: ItemDetailsModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="details-header">
          <h2>{item.name}</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close details"
          >
            ×
          </button>
        </div>

        <div className="details-body">
          {item.image_url && (
            <div className="detail-image-container">
              <img
                src={item.image_url}
                alt={item.name}
                className="detail-image"
              />
            </div>
          )}

          {item.category && (
            <div className="detail-row">
              <span className="detail-label">Category</span>
              <span className="detail-value badge">{item.category}</span>
            </div>
          )}

          <div className="detail-section">
            <h3>Description</h3>
            <p className="detail-description">
              {item.description || "No description provided."}
            </p>
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="detail-section">
              <h3>Tags</h3>
              <div className="detail-tags">
                {item.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-actions">
            <button
              className="secondary-action-button"
              onClick={onEdit}
            >
              Edit Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItemDetailsModal;


