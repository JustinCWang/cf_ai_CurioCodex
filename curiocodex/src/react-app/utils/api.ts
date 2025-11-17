/**
 * API utility functions for making authenticated requests.
 */

/**
 * Make an authenticated API request.
 * Automatically includes the Authorization header with the user's token.
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  token: string | null
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: headers as HeadersInit,
  });

  return response;
}

/**
 * Parse JSON response and handle errors.
 */
export async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }
  
  return data as T;
}

