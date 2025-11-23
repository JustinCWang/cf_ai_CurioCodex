/**
 * Generic confirmation modal used for destructive actions like delete.
 * Callers provide the title, message, and confirm/cancel handlers.
 */

interface ConfirmModalProps {
  title: string;
  message: string;
  /** Label for the primary destructive action button. */
  confirmLabel: string;
  /** Called when the user confirms the action. */
  onConfirm: () => void;
  /** Called when the user cancels or closes the modal. */
  onCancel: () => void;
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content delete-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="delete-confirm-button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;


