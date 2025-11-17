/**
 * Authentication helper functions for session management.
 */

import bcrypt from "bcryptjs";

/**
 * Generate a unique session token.
 */
export function generateSessionToken(): string {
  return crypto.randomUUID() + "-" + Date.now().toString(36);
}

/**
 * Get user data from a session token stored in KV.
 */
export async function getUserFromSession(
  token: string,
  kv: KVNamespace
): Promise<{ userId: string; email: string; username: string } | null> {
  const sessionData = await kv.get(`session:${token}`);
  if (!sessionData) return null;
  
  try {
    return JSON.parse(sessionData);
  } catch {
    return null;
  }
}

/**
 * Store a session in KV with expiration (7 days).
 */
export async function storeSession(
  token: string,
  userData: { userId: string; email: string; username: string },
  kv: KVNamespace
): Promise<void> {
  await kv.put(
    `session:${token}`,
    JSON.stringify(userData),
    { expirationTtl: 60 * 60 * 24 * 7 } // 7 days in seconds
  );
}

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

