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
import {
  generateEmbedding,
  categorizeItem,
  extractTags,
  averageEmbeddings,
} from "./ai";

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  AI: Ai;
  HOBBY_ITEMS_INDEX: VectorizeIndex;
}

interface Variables {
  user: {
    userId: string;
    email: string;
    username: string;
  };
}

interface HobbyRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string | null;
  created_at: number;
}

interface ItemRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string | null;
  created_at: number;
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
// Hobbies API Routes
// ============================================================================

/**
 * POST /api/hobbies
 * Create a new hobby with AI-powered categorization and embedding.
 */
app.post("/api/hobbies", async (c) => {
  const user = c.get("user");
  const { name, description } = await c.req.json();

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  try {
    // 1. Generate embedding from name and description
    const fullText = `${name} ${description || ""}`.trim();
    const embedding = await generateEmbedding(fullText, c.env.AI);

    // 2. Auto-categorize using AI
    const category = await categorizeItem(name, description || null, c.env.AI);

    // 3. Extract tags using AI
    const tags = await extractTags(name, description || null, c.env.AI);

    // 4. Create hobby in D1 database
    const hobbyId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO hobbies (id, user_id, name, description, category, tags, embedding_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        hobbyId,
        user.userId,
        name,
        description || null,
        category,
        JSON.stringify(tags),
        hobbyId
      )
      .run();

    // 5. Store embedding in Vectorize (optional in local dev)
    if (c.env.HOBBY_ITEMS_INDEX) {
      try {
        await c.env.HOBBY_ITEMS_INDEX.insert([
          {
            id: hobbyId,
            values: embedding,
            metadata: {
              type: "hobby",
              userId: user.userId,
              name: name,
              category: category,
            },
          },
        ]);
      } catch (error) {
        // Vectorize may not be available in local development (Windows filename issues)
        // Continue without Vectorize - app still works for basic CRUD
        console.warn("Vectorize not available (local dev?):", error);
      }
    }

    return c.json({
      success: true,
      hobby: {
        id: hobbyId,
        name,
        description,
        category,
        tags,
      },
    });
  } catch (error) {
    console.error("Error creating hobby:", error);
    return c.json({ error: "Failed to create hobby" }, 500);
  }
});

/**
 * GET /api/hobbies
 * Get all hobbies for the current user.
 */
app.get("/api/hobbies", async (c) => {
  const user = c.get("user");

  const hobbies = await c.env.DB.prepare(
    "SELECT id, name, description, category, tags, created_at FROM hobbies WHERE user_id = ? ORDER BY created_at DESC"
  )
    .bind(user.userId)
    .all<HobbyRow>();

  // Parse tags JSON strings
  const hobbiesWithParsedTags = hobbies.results.map((hobby) => ({
    ...hobby,
    tags: hobby.tags ? JSON.parse(hobby.tags) as string[] : [],
  }));

  return c.json({ hobbies: hobbiesWithParsedTags });
});

/**
 * GET /api/hobbies/:id/similar
 * Find similar hobbies/items to a specific hobby.
 */
app.get("/api/hobbies/:id/similar", async (c) => {
  const user = c.get("user");
  const hobbyId = c.req.param("id");

  try {
    // Verify the hobby belongs to the user first
    const hobby = await c.env.DB.prepare(
      "SELECT id, user_id FROM hobbies WHERE id = ?"
    )
      .bind(hobbyId)
      .first<{ id: string; user_id: string }>();

    if (!hobby || hobby.user_id !== user.userId) {
      return c.json({ error: "Hobby not found" }, 404);
    }

    // Try to get similar hobbies using Vectorize (may not be available in local dev)
    if (!c.env.HOBBY_ITEMS_INDEX) {
      return c.json({ similar: [] });
    }

    try {
      // Get the hobby's embedding from Vectorize
      const vectors = await c.env.HOBBY_ITEMS_INDEX.getByIds([hobbyId]);
      if (vectors.length === 0) {
        return c.json({ similar: [] });
      }

      // Find similar items (top 5, excluding the item itself)
      const matches = await c.env.HOBBY_ITEMS_INDEX.query(vectors[0].values, {
        topK: 6, // Get 6 to exclude self
        filter: {
          userId: user.userId,
        },
      });

      // Filter out the item itself and get top 5
      const similarMatches = matches.matches
        .filter((m) => m.id !== hobbyId)
        .slice(0, 5);

      if (similarMatches.length === 0) {
        return c.json({ similar: [] });
      }

      // Get metadata from D1 for matched items
      const similarIds = similarMatches.map((m) => m.id);
      const placeholders = similarIds.map(() => "?").join(",");
      const similarItems = await c.env.DB.prepare(
        `SELECT id, name, description, category, tags FROM hobbies 
         WHERE id IN (${placeholders})`
      )
        .bind(...similarIds)
        .all<HobbyRow>();

      // Parse tags and add similarity scores
      const results = similarItems.results.map((item, index) => ({
        ...item,
        tags: item.tags ? JSON.parse(item.tags) as string[] : [],
        similarity: similarMatches[index].score,
      }));

      return c.json({ similar: results });
    } catch (vectorizeError) {
      // Vectorize not available in local dev - return empty results
      console.warn("Vectorize not available (local dev?):", vectorizeError);
      return c.json({ similar: [] });
    }
  } catch (error) {
    console.error("Error finding similar hobbies:", error);
    return c.json({ error: "Failed to find similar hobbies" }, 500);
  }
});

/**
 * PUT /api/hobbies/:id
 * Update an existing hobby.
 */
app.put("/api/hobbies/:id", async (c) => {
  const user = c.get("user");
  const hobbyId = c.req.param("id");
  const { name, description } = await c.req.json();

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  try {
    // Verify hobby belongs to user
    const hobby = await c.env.DB.prepare(
      "SELECT id, user_id FROM hobbies WHERE id = ?"
    )
      .bind(hobbyId)
      .first<{ id: string; user_id: string }>();

    if (!hobby || hobby.user_id !== user.userId) {
      return c.json({ error: "Hobby not found" }, 404);
    }

    // Generate new embedding from updated name and description
    const fullText = `${name} ${description || ""}`.trim();
    const embedding = await generateEmbedding(fullText, c.env.AI);

    // Re-categorize and extract tags with AI
    const category = await categorizeItem(name, description || null, c.env.AI);
    const tags = await extractTags(name, description || null, c.env.AI);

    // Update hobby in D1 database
    await c.env.DB.prepare(
      `UPDATE hobbies 
       SET name = ?, description = ?, category = ?, tags = ? 
       WHERE id = ? AND user_id = ?`
    )
      .bind(
        name,
        description || null,
        category,
        JSON.stringify(tags),
        hobbyId,
        user.userId
      )
      .run();

    // Update embedding in Vectorize (optional in local dev)
    if (c.env.HOBBY_ITEMS_INDEX) {
      try {
        await c.env.HOBBY_ITEMS_INDEX.insert([
          {
            id: hobbyId,
            values: embedding,
            metadata: {
              type: "hobby",
              userId: user.userId,
              name: name,
              category: category,
            },
          },
        ]);
      } catch (error) {
        console.warn("Vectorize not available (local dev?):", error);
      }
    }

    return c.json({
      success: true,
      hobby: {
        id: hobbyId,
        name,
        description,
        category,
        tags,
      },
    });
  } catch (error) {
    console.error("Error updating hobby:", error);
    return c.json({ error: "Failed to update hobby" }, 500);
  }
});

/**
 * DELETE /api/hobbies/:id
 * Delete a hobby and all its associated items.
 */
app.delete("/api/hobbies/:id", async (c) => {
  const user = c.get("user");
  const hobbyId = c.req.param("id");

  try {
    // Verify hobby belongs to user
    const hobby = await c.env.DB.prepare(
      "SELECT id, user_id FROM hobbies WHERE id = ?"
    )
      .bind(hobbyId)
      .first<{ id: string; user_id: string }>();

    if (!hobby || hobby.user_id !== user.userId) {
      return c.json({ error: "Hobby not found" }, 404);
    }

    // Get item IDs before deleting (for Vectorize cleanup)
    const items = await c.env.DB.prepare(
      "SELECT id FROM items WHERE hobby_id = ?"
    )
      .bind(hobbyId)
      .all<{ id: string }>();

    const itemIds = items.results.map((item) => item.id);

    // Delete items first (due to foreign key constraint)
    await c.env.DB.prepare(
      "DELETE FROM items WHERE hobby_id = ?"
    )
      .bind(hobbyId)
      .run();

    // Delete hobby
    await c.env.DB.prepare(
      "DELETE FROM hobbies WHERE id = ? AND user_id = ?"
    )
      .bind(hobbyId, user.userId)
      .run();

    // Delete from Vectorize (optional in local dev)
    if (c.env.HOBBY_ITEMS_INDEX) {
      try {
        const idsToDelete = [hobbyId, ...itemIds];
        if (idsToDelete.length > 0) {
          await c.env.HOBBY_ITEMS_INDEX.deleteByIds(idsToDelete);
        }
      } catch (error) {
        console.warn("Vectorize not available (local dev?):", error);
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting hobby:", error);
    return c.json({ error: "Failed to delete hobby" }, 500);
  }
});

// ============================================================================
// Items API Routes
// ============================================================================

/**
 * POST /api/hobbies/:hobbyId/items
 * Create a new item within a hobby with AI features.
 */
app.post("/api/hobbies/:hobbyId/items", async (c) => {
  const user = c.get("user");
  const hobbyId = c.req.param("hobbyId");
  const { name, description } = await c.req.json();

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  try {
    // Verify hobby belongs to user
    const hobby = await c.env.DB.prepare(
      "SELECT id, user_id FROM hobbies WHERE id = ?"
    )
      .bind(hobbyId)
      .first<{ id: string; user_id: string }>();

    if (!hobby || hobby.user_id !== user.userId) {
      return c.json({ error: "Hobby not found" }, 404);
    }

    // Generate embedding
    const fullText = `${name} ${description || ""}`.trim();
    const embedding = await generateEmbedding(fullText, c.env.AI);

    // Auto-categorize
    const category = await categorizeItem(name, description || null, c.env.AI);

    // Extract tags
    const tags = await extractTags(name, description || null, c.env.AI);

    // Create item in D1
    const itemId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO items (id, hobby_id, name, description, category, tags, embedding_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        itemId,
        hobbyId,
        name,
        description || null,
        category,
        JSON.stringify(tags),
        itemId
      )
      .run();

    // Store embedding in Vectorize (optional in local dev)
    if (c.env.HOBBY_ITEMS_INDEX) {
      try {
        await c.env.HOBBY_ITEMS_INDEX.insert([
          {
            id: itemId,
            values: embedding,
            metadata: {
              type: "item",
              userId: user.userId,
              hobbyId: hobbyId,
              name: name,
              category: category,
            },
          },
        ]);
      } catch (error) {
        // Vectorize may not be available in local development (Windows filename issues)
        // Continue without Vectorize - app still works for basic CRUD
        console.warn("Vectorize not available (local dev?):", error);
      }
    }

    return c.json({
      success: true,
      item: {
        id: itemId,
        name,
        description,
        category,
        tags,
      },
    });
  } catch (error) {
    console.error("Error creating item:", error);
    return c.json({ error: "Failed to create item" }, 500);
  }
});

/**
 * GET /api/hobbies/:hobbyId/items
 * Get all items for a specific hobby.
 */
app.get("/api/hobbies/:hobbyId/items", async (c) => {
  const user = c.get("user");
  const hobbyId = c.req.param("hobbyId");

  // Verify hobby belongs to user
  const hobby = await c.env.DB.prepare(
    "SELECT id, user_id FROM hobbies WHERE id = ?"
  )
    .bind(hobbyId)
    .first<{ id: string; user_id: string }>();

  if (!hobby || hobby.user_id !== user.userId) {
    return c.json({ error: "Hobby not found" }, 404);
  }

  const items = await c.env.DB.prepare(
    "SELECT id, name, description, category, tags, created_at FROM items WHERE hobby_id = ? ORDER BY created_at DESC"
  )
    .bind(hobbyId)
    .all<ItemRow>();

  const itemsWithParsedTags = items.results.map((item) => ({
    ...item,
    tags: item.tags ? JSON.parse(item.tags) as string[] : [],
  }));

  return c.json({ items: itemsWithParsedTags });
});

/**
 * PUT /api/hobbies/:hobbyId/items/:id
 * Update an existing item.
 */
app.put("/api/hobbies/:hobbyId/items/:id", async (c) => {
  const user = c.get("user");
  const hobbyId = c.req.param("hobbyId");
  const itemId = c.req.param("id");
  const { name, description } = await c.req.json();

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  try {
    // Verify hobby belongs to user
    const hobby = await c.env.DB.prepare(
      "SELECT id, user_id FROM hobbies WHERE id = ?"
    )
      .bind(hobbyId)
      .first<{ id: string; user_id: string }>();

    if (!hobby || hobby.user_id !== user.userId) {
      return c.json({ error: "Hobby not found" }, 404);
    }

    // Verify item belongs to hobby
    const item = await c.env.DB.prepare(
      "SELECT id, hobby_id FROM items WHERE id = ?"
    )
      .bind(itemId)
      .first<{ id: string; hobby_id: string }>();

    if (!item || item.hobby_id !== hobbyId) {
      return c.json({ error: "Item not found" }, 404);
    }

    // Generate new embedding from updated name and description
    const fullText = `${name} ${description || ""}`.trim();
    const embedding = await generateEmbedding(fullText, c.env.AI);

    // Re-categorize and extract tags with AI
    const category = await categorizeItem(name, description || null, c.env.AI);
    const tags = await extractTags(name, description || null, c.env.AI);

    // Update item in D1 database
    await c.env.DB.prepare(
      `UPDATE items 
       SET name = ?, description = ?, category = ?, tags = ? 
       WHERE id = ? AND hobby_id = ?`
    )
      .bind(
        name,
        description || null,
        category,
        JSON.stringify(tags),
        itemId,
        hobbyId
      )
      .run();

    // Update embedding in Vectorize (optional in local dev)
    if (c.env.HOBBY_ITEMS_INDEX) {
      try {
        await c.env.HOBBY_ITEMS_INDEX.insert([
          {
            id: itemId,
            values: embedding,
            metadata: {
              type: "item",
              userId: user.userId,
              hobbyId: hobbyId,
              name: name,
              category: category,
            },
          },
        ]);
      } catch (error) {
        console.warn("Vectorize not available (local dev?):", error);
      }
    }

    return c.json({
      success: true,
      item: {
        id: itemId,
        name,
        description,
        category,
        tags,
      },
    });
  } catch (error) {
    console.error("Error updating item:", error);
    return c.json({ error: "Failed to update item" }, 500);
  }
});

/**
 * DELETE /api/hobbies/:hobbyId/items/:id
 * Delete an item.
 */
app.delete("/api/hobbies/:hobbyId/items/:id", async (c) => {
  const user = c.get("user");
  const hobbyId = c.req.param("hobbyId");
  const itemId = c.req.param("id");

  try {
    // Verify hobby belongs to user
    const hobby = await c.env.DB.prepare(
      "SELECT id, user_id FROM hobbies WHERE id = ?"
    )
      .bind(hobbyId)
      .first<{ id: string; user_id: string }>();

    if (!hobby || hobby.user_id !== user.userId) {
      return c.json({ error: "Hobby not found" }, 404);
    }

    // Verify item belongs to hobby
    const item = await c.env.DB.prepare(
      "SELECT id, hobby_id FROM items WHERE id = ?"
    )
      .bind(itemId)
      .first<{ id: string; hobby_id: string }>();

    if (!item || item.hobby_id !== hobbyId) {
      return c.json({ error: "Item not found" }, 404);
    }

    // Delete item
    await c.env.DB.prepare(
      "DELETE FROM items WHERE id = ? AND hobby_id = ?"
    )
      .bind(itemId, hobbyId)
      .run();

    // Delete from Vectorize (optional in local dev)
    if (c.env.HOBBY_ITEMS_INDEX) {
      try {
        await c.env.HOBBY_ITEMS_INDEX.deleteByIds([itemId]);
      } catch (error) {
        console.warn("Vectorize not available (local dev?):", error);
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return c.json({ error: "Failed to delete item" }, 500);
  }
});

// ============================================================================
// Recommendations API Routes
// ============================================================================

/**
 * GET /api/discover/recommendations
 * Get personalized hobby/item recommendations based on user's interests.
 */
app.get("/api/discover/recommendations", async (c) => {
  const user = c.get("user");

  try {
    // Get all user's hobbies
    const userHobbies = await c.env.DB.prepare(
      "SELECT id FROM hobbies WHERE user_id = ?"
    )
      .bind(user.userId)
      .all<{ id: string }>();

    if (userHobbies.results.length === 0) {
      return c.json({ recommendations: [] });
    }

    // Try to get recommendations using Vectorize (may not be available in local dev)
    if (!c.env.HOBBY_ITEMS_INDEX) {
      return c.json({ recommendations: [] });
    }

    try {
      // Get embeddings for all user hobbies
      const hobbyIds = userHobbies.results.map((h) => h.id);
      const embeddings = await c.env.HOBBY_ITEMS_INDEX.getByIds(hobbyIds);

      if (embeddings.length === 0) {
        return c.json({ recommendations: [] });
      }

      // Calculate average embedding to represent user's interest profile
      // Convert VectorFloatArray to number[] for averaging
      const embeddingVectors = embeddings.map((vec) => Array.from(vec.values));
      const avgEmbedding = averageEmbeddings(embeddingVectors);

      // Find similar items across all users (for discovery)
      // Note: Vectorize filter doesn't support $ne, so we'll filter in code
      const matches = await c.env.HOBBY_ITEMS_INDEX.query(avgEmbedding, {
        topK: 20, // Get more to filter out user's own items
      });

      // Filter out user's own items and get top 10
      const recommendations = matches.matches
        .filter((m) => {
          const metadata = m.metadata as { userId?: string };
          return metadata.userId !== user.userId;
        })
        .slice(0, 10);

      if (recommendations.length === 0) {
        return c.json({ recommendations: [] });
      }

      // Get metadata from D1
      const recIds = recommendations.map((r) => r.id);
      const placeholders = recIds.map(() => "?").join(",");
      const recData = await c.env.DB.prepare(
        `SELECT id, name, description, category, tags FROM hobbies 
         WHERE id IN (${placeholders})`
      )
        .bind(...recIds)
        .all<HobbyRow>();

      // Parse tags and add similarity scores
      const results = recData.results.map((item, index) => ({
        ...item,
        tags: item.tags ? JSON.parse(item.tags) as string[] : [],
        similarity: recommendations[index].score,
      }));

      return c.json({ recommendations: results });
    } catch (vectorizeError) {
      // Vectorize not available in local dev - return empty results
      console.warn("Vectorize not available (local dev?):", vectorizeError);
      return c.json({ recommendations: [] });
    }
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return c.json({ error: "Failed to get recommendations" }, 500);
  }
});

/**
 * GET /api/discover/by-category/:category
 * Get hobbies/items by category.
 */
app.get("/api/discover/by-category/:category", async (c) => {
  const category = c.req.param("category");

  const hobbies = await c.env.DB.prepare(
    "SELECT id, name, description, category, tags, created_at FROM hobbies WHERE category = ? ORDER BY created_at DESC LIMIT 20"
  )
    .bind(category)
    .all<HobbyRow>();

  const hobbiesWithParsedTags = hobbies.results.map((hobby) => ({
    ...hobby,
    tags: hobby.tags ? JSON.parse(hobby.tags) as string[] : [],
  }));

  return c.json({ hobbies: hobbiesWithParsedTags });
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
