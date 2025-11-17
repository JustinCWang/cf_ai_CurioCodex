/**
 * Backend API server using Hono framework on Cloudflare Workers.
 * Handles API requests and serves static assets at the edge.
 */

import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// API Routes
// Placeholder endpoint - will be replaced with hobby tracking endpoints
app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

export default app;
