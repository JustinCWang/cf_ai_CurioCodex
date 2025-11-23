/**
 * Constellation visualization for the CurioCodex features.
 * Each "star" represents a main feature and links to its route.
 */

import {
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import "./Constellation.css";

const STORAGE_KEY = "curiocodex_constellation_stars";

type StarId =
  | "dashboard"
  | "hobbies"
  | "items"
  | "discover"
  | "add"
  | "activity"
  | "settings";

interface StarConfig {
  id: StarId;
  label: string;
  x: number;
  y: number;
  route: string;
}

interface Connection {
  from: StarId;
  to: StarId;
}

type DragState = {
  id: StarId;
  offsetX: number;
  offsetY: number;
  hasMoved: boolean;
};

// Approximate coordinates for a hexagon with a central star.
// ViewBox: 0..100 (x), 0..60 (y)
const INITIAL_STARS: StarConfig[] = [
  // Center
  { id: "dashboard", label: "Atlas", x: 50, y: 30, route: "/" },
  // Hexagon vertices around the center
  { id: "settings", label: "Settings", x: 50, y: 8, route: "/settings" },
  { id: "discover", label: "Discover", x: 72, y: 20, route: "/discover" },
  { id: "items", label: "Items", x: 72, y: 40, route: "/items" },
  { id: "add", label: "Add", x: 50, y: 52, route: "/add" },
  { id: "activity", label: "Activity", x: 28, y: 40, route: "/activity" },
  { id: "hobbies", label: "Hobbies", x: 28, y: 20, route: "/hobbies" },
];

const CONNECTIONS: Connection[] = [
  // Hexagon outline
  { from: "settings", to: "discover" },
  { from: "discover", to: "items" },
  { from: "items", to: "add" },
  { from: "add", to: "activity" },
  { from: "activity", to: "hobbies" },
  { from: "hobbies", to: "settings" },
  // Spokes from center
  { from: "dashboard", to: "settings" },
  { from: "dashboard", to: "discover" },
  { from: "dashboard", to: "items" },
  { from: "dashboard", to: "add" },
  { from: "dashboard", to: "activity" },
  { from: "dashboard", to: "hobbies" },
];

function Constellation() {
  const [stars, setStars] = useState<StarConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load constellation state:", e);
    }
    return INITIAL_STARS;
  });
  const [, setDragState] = useState<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const navigate = useNavigate();

  const getSvgPoint = (
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 60;
    return { x, y };
  };

  const handleActivate = (route: string) => {
    navigate(route);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, route: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate(route);
    }
  };

  const handleStarMouseDown = (
    event: ReactMouseEvent<SVGGElement>,
    starId: StarId,
  ) => {
    event.preventDefault();
    const point = getSvgPoint(event.clientX, event.clientY);
    if (!point) return;
    const star = stars.find((s) => s.id === starId);
    if (!star) return;

    setDragState({
      id: starId,
      offsetX: point.x - star.x,
      offsetY: point.y - star.y,
      hasMoved: false,
    });
  };

  const handleSvgMouseMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    setDragState((current) => {
      if (!current) return current;
      const point = getSvgPoint(event.clientX, event.clientY);
      if (!point) return current;

      const rawX = point.x - current.offsetX;
      const rawY = point.y - current.offsetY;
      const clampedX = Math.max(5, Math.min(95, rawX));
      const clampedY = Math.max(5, Math.min(55, rawY));

      setStars((prev) =>
        prev.map((star) =>
          star.id === current.id
            ? { ...star, x: clampedX, y: clampedY }
            : star,
        ),
      );

      if (!current.hasMoved) {
        return { ...current, hasMoved: true };
      }
      return current;
    });
  };

  const handleSvgMouseUp = () => {
    setDragState((current) => {
      if (current && current.hasMoved) {
        // Persist new star positions to localStorage only when a drag finishes
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stars));
      }
      return null;
    });
  };

  const handleStarMouseUp = (route: string) => {
    setDragState((current) => {
      if (!current || !current.hasMoved) {
        handleActivate(route);
      }
      return null;
    });
  };

  const starById = new Map<StarId, StarConfig>(stars.map((s) => [s.id, s]));

  return (
    <section
      className="constellation-section"
      aria-label="CurioCodex feature constellation"
    >
      <div className="constellation-container">
        <svg
          className="constellation-svg"
          viewBox="0 0 100 60"
          role="img"
          aria-label="Interactive constellation of CurioCodex features"
          ref={svgRef}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
        >
          <defs>
            <radialGradient id="star-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#ffd27f" />
              <stop offset="100%" stopColor="#d4af37" stopOpacity="0.1" />
            </radialGradient>

            <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
              <stop offset="40%" stopColor="rgba(148, 187, 233, 0.8)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
            </radialGradient>

            <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
            </filter>
          </defs>

          {CONNECTIONS.map((connection, index) => {
            const from = starById.get(connection.from);
            const to = starById.get(connection.to);
            if (!from || !to) return null;

            return (
              <line
                key={`${connection.from}-${connection.to}-${index}`}
                className="constellation-line"
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
              />
            );
          })}

          {stars.map((star) => (
            <g
              key={star.id}
              className="constellation-star"
              transform={`translate(${star.x}, ${star.y})`}
              onMouseDown={(event) => handleStarMouseDown(event, star.id)}
              onMouseUp={() => handleStarMouseUp(star.route)}
              onKeyDown={(event) => handleKeyDown(event, star.route)}
              tabIndex={0}
              role="button"
              aria-label={star.label}
            >
              <circle
                className="constellation-star-glow"
                r={4.5}
                fill="url(#star-glow)"
                filter="url(#soft-glow)"
              />
              <circle
                className="constellation-star-core"
                r={1.4}
                fill="url(#star-core)"
              />
              <circle className="constellation-star-outline" r={2.4} />
              <text
                className="constellation-star-label"
                x={0}
                y={7}
                textAnchor="middle"
              >
                {star.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

export default Constellation;




