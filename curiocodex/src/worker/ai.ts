/**
 * AI helper functions for embeddings, categorization, and recommendations.
 * Uses Cloudflare Workers AI and Vectorize.
 */

/**
 * Generate embedding vector for a hobby/item using Workers AI.
 * Uses BGE (BAAI General Embedding) model optimized for semantic similarity.
 */
export async function generateEmbedding(
  text: string,
  ai: Ai
): Promise<number[]> {
  try {
    // Clean and prepare text
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error("Text cannot be empty");
    }

    // Use BGE embedding model (768 dimensions)
    const response = await ai.run("@cf/baai/bge-base-en-v1.5", {
      text: [cleanText],
    });

    // Check if response is async (has request_id)
    if ("request_id" in response) {
      throw new Error("Async response not supported for embeddings");
    }

    // TypeScript now knows this is the embedding response type
    // Response.data is number[][] (array of embeddings, one per input text)
    const embeddingResponse = response as { data?: number[][]; shape?: number[]; pooling?: string };
    const embedding = embeddingResponse.data?.[0];
    
    if (!embedding || embedding.length !== 768) {
      throw new Error("Invalid embedding response");
    }

    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Auto-categorize a hobby/item using Workers AI text generation.
 * Returns a category name based on the hobby/item name and description.
 */
export async function categorizeItem(
  name: string,
  description: string | null,
  ai: Ai
): Promise<string> {
  try {
    const categories = [
      "Arts & Crafts",
      "Technology",
      "Sports & Fitness",
      "Music",
      "Reading",
      "Gaming",
      "Cooking",
      "Travel",
      "Photography",
      "Collecting",
      "Outdoor Activities",
      "Learning & Education",
      "Other",
    ];

    const prompt = `Categorize this hobby/item into exactly one of these categories: ${categories.join(", ")}.

Name: ${name}
Description: ${description || "No description provided"}

Return ONLY the category name, nothing else:`;

    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: prompt,
      max_tokens: 20,
      temperature: 0.3, // Lower temperature for more consistent categorization
    });

    // Check if response is async
    if ("request_id" in response) {
      throw new Error("Async response not supported");
    }

    const category = (response.response || "").trim();
    
    // Validate category is in our list
    const normalizedCategory = categories.find(
      (cat) => cat.toLowerCase() === category.toLowerCase()
    );

    return normalizedCategory || "Other";
  } catch (error) {
    console.error("Error categorizing item:", error);
    return "Other"; // Default fallback
  }
}

/**
 * Extract tags/keywords from hobby/item description using AI.
 * Returns an array of relevant tags.
 */
export async function extractTags(
  name: string,
  description: string | null,
  ai: Ai
): Promise<string[]> {
  try {
    const prompt = `Extract 3-5 relevant tags/keywords for this hobby/item. Return only comma-separated tags, no other text.

Name: ${name}
Description: ${description || "No description"}

Tags:`;

    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: prompt,
      max_tokens: 50,
      temperature: 0.5,
    });

    // Check if response is async
    if ("request_id" in response) {
      throw new Error("Async response not supported");
    }

    const tagsText = (response.response || "").trim();
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
      .slice(0, 5); // Limit to 5 tags

    return tags;
  } catch (error) {
    console.error("Error extracting tags:", error);
    return []; // Return empty array on error
  }
}

/**
 * Calculate average embedding from multiple embeddings.
 * Useful for creating user interest profiles.
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new Error("Cannot average empty embeddings array");
  }

  const dimension = embeddings[0].length;
  const avg = new Array(dimension).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      avg[i] += embedding[i];
    }
  }

  // Normalize by dividing by count
  for (let i = 0; i < dimension; i++) {
    avg[i] /= embeddings.length;
  }

  return avg;
}

