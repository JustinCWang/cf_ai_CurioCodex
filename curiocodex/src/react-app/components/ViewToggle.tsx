/**
 * Generic view toggle control used by collection pages.
 * Renders radio-style buttons for "card", "list", and optionally "icon" layouts.
 */

type ViewMode = "card" | "list" | "icon";

interface ViewToggleLabels {
  card?: string;
  list?: string;
  icon?: string;
}

interface ViewToggleProps {
  /** Currently selected view mode. */
  mode: ViewMode;
  /** Called when the user selects a new view mode. */
  onChange: (mode: ViewMode) => void;
  /** Accessible label describing what this toggle controls. */
  ariaLabel: string;
  /** Optional custom labels for each view mode (defaults are Card/List/Icon). */
  labels?: ViewToggleLabels;
  /** Whether to show the icon/compact view option (defaults to true). */
  showIcon?: boolean;
}

function ViewToggle({
  mode,
  onChange,
  ariaLabel,
  labels,
  showIcon = true,
}: ViewToggleProps) {
  const effectiveLabels: Required<ViewToggleLabels> = {
    card: labels?.card ?? "Card",
    list: labels?.list ?? "List",
    icon: labels?.icon ?? "Icon",
  };

  return (
    <div
      className="view-toggle"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={`view-toggle-button ${mode === "card" ? "active" : ""}`}
        onClick={() => onChange("card")}
        role="radio"
        aria-checked={mode === "card"}
      >
        <span className="view-toggle-icon">🧊</span>
        <span className="view-toggle-label">{effectiveLabels.card}</span>
      </button>

      <button
        type="button"
        className={`view-toggle-button ${mode === "list" ? "active" : ""}`}
        onClick={() => onChange("list")}
        role="radio"
        aria-checked={mode === "list"}
      >
        <span className="view-toggle-icon">📄</span>
        <span className="view-toggle-label">{effectiveLabels.list}</span>
      </button>

      {showIcon && (
        <button
          type="button"
          className={`view-toggle-button ${mode === "icon" ? "active" : ""}`}
          onClick={() => onChange("icon")}
          role="radio"
          aria-checked={mode === "icon"}
        >
          <span className="view-toggle-icon">🔳</span>
          <span className="view-toggle-label">{effectiveLabels.icon}</span>
        </button>
      )}
    </div>
  );
}

export type { ViewMode, ViewToggleProps };
export default ViewToggle;


