/**
 * Backend API server using Hono framework on Cloudflare Workers.
 * Handles API requests and serves static assets at the edge.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  generateSessionToken,
  getUserFromSession,
  storeSession,
  hashPassword,
  verifyPassword,
} from "./auth";

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
}

interface Variables {
  user: {
    userId: string;
    email: string;
    username: string;
  };
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS middleware - allows frontend to make requests
app.use("/api/*", cors({
  origin: "*", // In production, replace with your domain
  credentials: true,
}));

// ============================================================================
// Authentication Routes
// ============================================================================

/**
 * POST /api/auth/register
 * Register a new user account.
 */
app.post("/api/auth/register", async (c) => {
  try {
    const { email, password, username } = await c.req.json();
    
    // Validate input
    if (!email || !password || !username) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Validate email format (basic check)
    if (!email.includes("@")) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ? OR username = ?"
    ).bind(email, username).first();

    if (existingUser) {
      return c.json({ error: "User already exists" }, 400);
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();

    // Insert user into D1 database
    await c.env.DB.prepare(
      "INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)"
    ).bind(userId, email, username, passwordHash).run();

    // Create session token
    const sessionToken = generateSessionToken();
    const sessionData = {
      userId,
      email,
      username,
    };

    // Store session in KV
    await storeSession(sessionToken, sessionData, c.env.SESSIONS);

    return c.json({
      success: true,
      token: sessionToken,
      user: sessionData,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * POST /api/auth/login
 * Login with email and password.
 */
app.post("/api/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Missing email or password" }, 400);
    }

    // Find user in D1 database
    const user = await c.env.DB.prepare(
      "SELECT id, email, username, password_hash FROM users WHERE email = ?"
    ).bind(email).first<{
      id: string;
      email: string;
      username: string;
      password_hash: string;
    }>();

    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Create session token
    const sessionToken = generateSessionToken();
    const sessionData = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    // Store session in KV
    await storeSession(sessionToken, sessionData, c.env.SESSIONS);

    return c.json({
      success: true,
      token: sessionToken,
      user: sessionData,
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate session.
 */
app.post("/api/auth/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // Delete session from KV
    await c.env.SESSIONS.delete(`session:${token}`);
  }
  return c.json({ success: true });
});

// ============================================================================
// Authentication Middleware
// ============================================================================

/**
 * Middleware to protect routes that require authentication.
 * Checks for valid session token and attaches user to context.
 */
app.use("/api/*", async (c, next) => {
  // Skip auth for public routes
  const publicRoutes = ["/api/auth/login", "/api/auth/register"];
  if (publicRoutes.some(route => c.req.path.includes(route))) {
    await next();
    return;
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);
  const user = await getUserFromSession(token, c.env.SESSIONS);

  if (!user) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  // Attach user to context for use in route handlers
  c.set("user", user);
  await next();
});

// ============================================================================
// Protected Routes (require authentication)
// ============================================================================

/**
 * GET /api/user/profile
 * Get current user's profile.
 */
app.get("/api/user/profile", async (c) => {
  const user = c.get("user");
  
  // Fetch full user data from D1
  const userData = await c.env.DB.prepare(
    "SELECT id, email, username, created_at FROM users WHERE id = ?"
  ).bind(user.userId).first();

  return c.json({ user: userData });
});

// ============================================================================
// Public Routes
// ============================================================================

/**
 * GET /api/
 * Health check endpoint.
 */
app.get("/api/", (c) => c.json({ name: "Cloudflare", status: "ok" }));

export default app;
