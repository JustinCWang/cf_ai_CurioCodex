/**
 * Constellation visualization for the CurioCodex features.
 * Each "star" represents a main feature and links to its route.
 */

import {
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
  useEffect,
  useMemo,
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

// Initial coordinates for the constellation (normalized to the SVG viewBox).
// Default ViewBox: 0..100 (x), 0..80 (y).
const INITIAL_STARS: StarConfig[] = [
  { id: "dashboard", label: "Atlas", x: 58.82627344865302, y: 39.69262678180379, route: "/" },
  { id: "settings", label: "Settings", x: 87.4439461883408, y: 31.25992779783394, route: "/settings" },
  { id: "discover", label: "Discover", x: 39.1585298052922, y: 32.8669730715749, route: "/discover" },
  { id: "items", label: "Items", x: 16.618834080717498, y: 40.14440433212996, route: "/items" },
  { id: "add", label: "Add", x: 40.341040898863504, y: 56.20899451178222, route: "/add" },
  { id: "activity", label: "Activity", x: 75.26905829596413, y: 58.19494584837544, route: "/activity" },
  { id: "hobbies", label: "Hobbies", x: 19.704035874439473, y: 13.931407942238266, route: "/hobbies" },
];

// Base constellation connections based on initial layout
const BASE_CONNECTIONS: Connection[] = [
  { from: "dashboard", to: "discover" },
  { from: "dashboard", to: "activity" },
  { from: "dashboard", to: "settings" },
  { from: "hobbies", to: "items" },
  { from: "items", to: "discover" },
  { from: "discover", to: "add" },
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
  const [starScale, setStarScale] = useState(1);
  const [viewBoxHeight, setViewBoxHeight] = useState(80);
  const [dragBounds, setDragBounds] = useState({
    minX: 5,
    maxX: 95,
    minY: 7,
    maxY: 73,
  });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const navigate = useNavigate();

  // Adjust star scale and the effective vertical space of the SVG based on
  // viewport size. On smaller screens we keep stars comfortably sized while
  // expanding the vertical coordinate range and drag bounds so users can drag
  // stars further up and down, even though horizontal room is limited.
  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === "undefined") return;
      const width = window.innerWidth;

      // Compute responsive starScale and viewBoxHeight first so we can derive
      // safe drag bounds that keep the full star (including glow) visible
      // within the SVG without clipping, even on very large displays.
      let nextScale: number;
      let nextViewBoxHeight: number;

      if (width <= 768) {
        // Phones / small tablets: big stars with extra vertical space.
        nextScale = 2;
        nextViewBoxHeight = 110;
      } else if (width <= 1200) {
        // Medium screens / laptops: moderate stars.
        nextScale = 1.1;
        nextViewBoxHeight = 90;
      } else {
        // Large desktop displays: slightly smaller stars so they don't feel huge.
        nextScale = 0.9;
        nextViewBoxHeight = 80;
      }

      const glowRadius = 6 * nextScale; // matches constellation-star-glow r
      const edgeMargin = 2; // small visual cushion inside the SVG border

      const minX = glowRadius + edgeMargin;
      const maxX = 100 - glowRadius - edgeMargin;
      const minY = glowRadius + edgeMargin;
      const maxY = nextViewBoxHeight - glowRadius - edgeMargin;

      setStarScale(nextScale);
      setViewBoxHeight(nextViewBoxHeight);
      setDragBounds({
        minX,
        maxX,
        minY,
        maxY,
      });
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  const getSvgPoint = (
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * viewBoxHeight;
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

  const startDrag = (clientX: number, clientY: number, starId: StarId) => {
    const point = getSvgPoint(clientX, clientY);
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

  const moveDrag = (clientX: number, clientY: number) => {
    setDragState((current) => {
      if (!current) return current;
      const point = getSvgPoint(clientX, clientY);
      if (!point) return current;

      const rawX = point.x - current.offsetX;
      const rawY = point.y - current.offsetY;
      const clampedX = Math.max(
        dragBounds.minX,
        Math.min(dragBounds.maxX, rawX),
      );
      const clampedY = Math.max(
        dragBounds.minY,
        Math.min(dragBounds.maxY, rawY),
      );

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

  const endDrag = () => {
    setDragState(() => null);
  };

  const handleStarMouseDown = (
    event: ReactMouseEvent<SVGGElement>,
    starId: StarId,
  ) => {
    event.preventDefault();
    startDrag(event.clientX, event.clientY, starId);
  };

  const handleStarTouchStart = (
    event: ReactTouchEvent<SVGGElement>,
    starId: StarId,
  ) => {
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;
    startDrag(touch.clientX, touch.clientY, starId);
  };

  const handleSvgMouseMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    moveDrag(event.clientX, event.clientY);
  };

  const handleSvgTouchMove = (event: ReactTouchEvent<SVGSVGElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    moveDrag(touch.clientX, touch.clientY);
  };

  const handleSvgPointerUp = () => {
    endDrag();
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

  const handleResetLayout = () => {
    setStars(INITIAL_STARS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear constellation state:", e);
    }
    setDragState(null);
  };

  const handleSaveLayout = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stars));
    } catch (e) {
      console.warn("Failed to save constellation state:", e);
    }
  };

  // Dynamically compute lightweight connections by linking each star to its
  // nearest neighbour. This adapts as stars are dragged around and helps avoid
  // heavy line overlap while keeping the graph visually connected.
  const dynamicConnections: Connection[] = useMemo(() => {
    if (stars.length < 2) return [];

    const edges = new Set<string>();

    for (let i = 0; i < stars.length; i++) {
      const from = stars[i];
      let nearestIndex = -1;
      let nearestDist = Infinity;

      for (let j = 0; j < stars.length; j++) {
        if (i === j) continue;
        const to = stars[j];
        const dx = from.x - to.x;
        const dy = from.y - to.y;
        const dist = dx * dx + dy * dy;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = j;
        }
      }

      if (nearestIndex !== -1) {
        const to = stars[nearestIndex];
        const a = from.id;
        const b = to.id;
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        edges.add(key);
      }
    }

    return Array.from(edges).map((key) => {
      const [a, b] = key.split("-") as StarId[];
      return { from: a, to: b };
    });
  }, [stars]);

  // For the untouched, default layout, show the full base constellation so the
  // initial experience feels intentional and richly connected. As soon as the
  // user moves any star, switch to the dynamic distance-based connections.
  const isDefaultLayout = useMemo(() => {
    if (stars.length !== INITIAL_STARS.length) return false;
    return INITIAL_STARS.every((base) => {
      const current = stars.find((s) => s.id === base.id);
      if (!current) return false;
      const dx = Math.abs(current.x - base.x);
      const dy = Math.abs(current.y - base.y);
      // Small tolerance in case of minor floating point differences.
      return dx < 0.1 && dy < 0.1;
    });
  }, [stars]);

  const connectionsToRender = isDefaultLayout ? BASE_CONNECTIONS : dynamicConnections;

  return (
    <section
      className="constellation-section"
      aria-label="CurioCodex feature constellation"
    >
      <div className="constellation-container">
        <svg
          className="constellation-svg"
          viewBox={`0 0 100 ${viewBoxHeight}`}
          role="img"
          aria-label="Interactive constellation of CurioCodex features"
          ref={svgRef}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgPointerUp}
          onMouseLeave={handleSvgPointerUp}
          onTouchMove={handleSvgTouchMove}
          onTouchEnd={handleSvgPointerUp}
          onTouchCancel={handleSvgPointerUp}
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

            {/* Atlas (dashboard) star uses a distinct green glow to indicate the
             * current page context. */}
            <radialGradient id="star-core-atlas" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#eafffb" />
              <stop offset="40%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.15" />
            </radialGradient>

            <radialGradient id="star-glow-atlas" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(224, 255, 244, 0.95)" />
              <stop offset="40%" stopColor="rgba(45, 212, 191, 0.85)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
            </radialGradient>

            <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
            </filter>
          </defs>

          {connectionsToRender.map((connection, index) => {
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

          {stars.map((star) => {
            const isAtlas = star.id === "dashboard";
            // If a star is dragged near the bottom of the SVG, flip the label to
            // render above the star instead of below so it doesn't get cut off.
            const labelOffset = 9;
            const isNearBottom = star.y > viewBoxHeight - (labelOffset + 4);
            const labelY = isNearBottom ? -labelOffset : labelOffset;

            return (
              <g
                key={star.id}
                className="constellation-star"
                transform={`translate(${star.x}, ${star.y})`}
                onMouseDown={(event) => handleStarMouseDown(event, star.id)}
                onTouchStart={(event) => handleStarTouchStart(event, star.id)}
                onMouseUp={() => handleStarMouseUp(star.route)}
                onTouchEnd={() => handleStarMouseUp(star.route)}
                onKeyDown={(event) => handleKeyDown(event, star.route)}
                tabIndex={0}
                role="button"
                aria-label={star.label}
              >
                <circle
                  className="constellation-star-glow"
                  r={6 * starScale}
                  fill={isAtlas ? "url(#star-glow-atlas)" : "url(#star-glow)"}
                  filter="url(#soft-glow)"
                />
                <circle
                  className="constellation-star-core"
                  r={3 * starScale}
                  fill={isAtlas ? "url(#star-core-atlas)" : "url(#star-core)"}
                />
                <circle
                  className="constellation-star-outline"
                  r={4 * starScale}
                />
                <text
                  className="constellation-star-label"
                  x={0}
                  y={labelY}
                  textAnchor="middle"
                >
                  {star.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="constellation-controls">
          <button
            type="button"
            className="constellation-control-button constellation-control-reset"
            aria-label="Reset star layout"
            onClick={handleResetLayout}
          >
            <span className="constellation-control-button-icon">⟳</span>
          </button>
          <button
            type="button"
            className="constellation-control-button constellation-control-save"
            aria-label="Save star layout"
            onClick={handleSaveLayout}
          >
            <span className="constellation-control-button-icon">💾</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default Constellation;




