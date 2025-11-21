/**
 * Constellation visualization for the CurioCodex features.
 * Each "star" represents a main feature and links to its route.
 */

import { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./Constellation.css";

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

const STARS: StarConfig[] = [
  { id: "dashboard", label: "Dashboard", x: 15, y: 30, route: "/" },
  { id: "hobbies", label: "Hobbies", x: 32, y: 18, route: "/hobbies" },
  { id: "items", label: "Items", x: 52, y: 12, route: "/items" },
  { id: "discover", label: "Discover", x: 72, y: 24, route: "/discover" },
  { id: "add", label: "Add", x: 60, y: 42, route: "/add" },
  { id: "activity", label: "Activity", x: 38, y: 46, route: "/activity" },
  { id: "settings", label: "Settings", x: 82, y: 40, route: "/settings" },
];

const CONNECTIONS: Connection[] = [
  { from: "dashboard", to: "hobbies" },
  { from: "hobbies", to: "items" },
  { from: "items", to: "discover" },
  { from: "discover", to: "settings" },
  { from: "settings", to: "add" },
  { from: "add", to: "activity" },
  { from: "activity", to: "dashboard" },
  { from: "hobbies", to: "activity" },
  { from: "items", to: "add" },
];

const starById = new Map<StarId, StarConfig>(STARS.map((s) => [s.id, s]));

function Constellation() {
  const navigate = useNavigate();

  const handleActivate = (route: string) => {
    navigate(route);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, route: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate(route);
    }
  };

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

          {STARS.map((star) => (
            <g
              key={star.id}
              className="constellation-star"
              transform={`translate(${star.x}, ${star.y})`}
              onClick={() => handleActivate(star.route)}
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




