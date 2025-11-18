/**
 * AI helper functions for embeddings, categorization, and recommendations.
 * Uses Cloudflare Workers AI and Vectorize.
 */

/**
 * Available categories for hobbies and items.
 * This list is used for both AI categorization and manual selection.
 */
export const CATEGORIES = [
  "Arts & Crafts",
  "Digital Media",
  "Technology",
  "Sports & Fitness",
  "Music",
  "Reading",
  "Gaming",
  "Cooking",
  "Travel",
  "Photography",
  "Collectables",
  "Outdoor Activities",
  "Learning & Education",
  "Other",
] as const;

export type Category = typeof CATEGORIES[number];

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
    const prompt = `Categorize this hobby/item into exactly one of these categories: ${CATEGORIES.join(", ")}.

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
    const normalizedCategory = CATEGORIES.find(
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

/**
 * Analyze an image and extract name, description, and category.
 * Uses Workers AI vision model to understand the image content.
 * Returns an object with suggested name, description, and category.
 */
export interface ImageAnalysisResult {
  name: string;
  description: string;
  category: string;
}

export async function analyzeImage(
  imageData: ArrayBuffer,
  ai: Ai
): Promise<ImageAnalysisResult> {
  try {
    // Convert ArrayBuffer to number array (pixel data) for vision models
    const uint8Array = new Uint8Array(imageData);
    const imageArray = Array.from(uint8Array);
    
    // Step 1: Use vision model to describe the image in a paragraph
    let imageDescription = "";
    try {
      // Accept the license agreement first
      try {
        await ai.run("@cf/meta/llama-3.2-11b-vision-instruct", {
          prompt: "agree",
        });
      } catch (licenseError: unknown) {
        const errorMessage = licenseError instanceof Error ? licenseError.message : String(licenseError);
        if (!errorMessage.includes("Thank you for agreeing")) {
          throw licenseError;
        }
      }
      
      // Ask vision model to describe the image
      const visionResponse = await ai.run("@cf/meta/llama-3.2-11b-vision-instruct", {
        image: imageArray as number[],
        prompt: "Describe this image in detail. What is the main object or item? What does it look like? What is it used for? Write a paragraph describing what you see.",
        max_tokens: 300,
        temperature: 0.5,
      });

      // Extract description text from vision model response
      // Vision model returns { response?: string }
      if ('response' in visionResponse && visionResponse.response) {
        imageDescription = String(visionResponse.response);
      } else if (typeof visionResponse === 'string') {
        imageDescription = visionResponse;
      } else {
        imageDescription = JSON.stringify(visionResponse);
      }
      imageDescription = imageDescription.trim();
    } catch (visionError) {
      console.error("Vision model error:", visionError);
      throw new Error("Vision model not available");
    }

    if (!imageDescription) {
      throw new Error("No description generated from image");
    }

    // Step 2: Use text model to extract structured data from the description
    const extractionPrompt = `Based on this description of an item, extract:
1. A concise name for the item (2-5 words)
2. A brief description (1-2 sentences)
3. A category from this list: ${CATEGORIES.join(", ")}

Item description: ${imageDescription}

Return your response in this exact JSON format:
{
  "name": "item name here",
  "description": "description here",
  "category": "category name here"
}`;

    const textResponse = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: extractionPrompt,
      max_tokens: 200,
      temperature: 0.3,
    });

    // Check if response is async
    if ("request_id" in textResponse) {
      throw new Error("Async response not supported");
    }

    // Extract response text from text model
    // Text model returns { response?: string }
    let responseText = "";
    if ('response' in textResponse && textResponse.response) {
      responseText = String(textResponse.response);
    } else if (typeof textResponse === 'string') {
      responseText = textResponse;
    } else {
      responseText = JSON.stringify(textResponse);
    }
    responseText = responseText.trim();
    
    // Parse JSON from the text model response
    let analysis: ImageAnalysisResult;
    try {
      // Try to extract JSON from response
      let jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch) {
        jsonMatch = responseText.match(/\{[\s\S]*\}/);
      }
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        analysis = JSON.parse(jsonStr);
      } else {
        // Fallback: extract from text
        analysis = extractInfoFromText(responseText);
      }
    } catch {
      // Fallback: extract from text
      analysis = extractInfoFromText(responseText);
    }

    // Validate and normalize category
    const normalizedCategory = CATEGORIES.find(
      (cat) => cat.toLowerCase() === analysis.category.toLowerCase()
    ) || "Other";

    return {
      name: analysis.name.trim() || "Unnamed Item",
      description: analysis.description.trim() || imageDescription.substring(0, 200),
      category: normalizedCategory,
    };
  } catch (error) {
    console.error("Error analyzing image:", error);
    // Return default values on error
    return {
      name: "Unnamed Item",
      description: "Unable to analyze image",
      category: "Other",
    };
  }
}


/**
 * Fallback function to extract information from text if JSON parsing fails.
 */
function extractInfoFromText(text: string): ImageAnalysisResult {
  // Try multiple patterns to extract information from text
  // Pattern 1: Look for structured format like "Name: ... Description: ... Category: ..."
  let nameMatch = text.match(/name["\s:]+([^\n,}]+)/i) || 
                  text.match(/1\.\s*A?\s*concise\s*name[:\s]+([^\n]+)/i) ||
                  text.match(/name[:\s]+([^\n]+)/i);
  
  const descMatch = text.match(/description["\s:]+([^\n}]+)/i) ||
                  text.match(/2\.\s*A?\s*brief\s*description[:\s]+([^\n]+)/i) ||
                  text.match(/description[:\s]+([^\n]+)/i);
  
  const catMatch = text.match(/category["\s:]+([^\n,}]+)/i) ||
                 text.match(/3\.\s*A?\s*category[:\s]+([^\n]+)/i) ||
                 text.match(/category[:\s]+([^\n]+)/i);

  // If we still can't find structured data, try to extract from natural language
  if (!nameMatch && text.length > 0) {
    // Take first line or first sentence as name
    const firstLine = text.split('\n')[0].split('.')[0].trim();
    if (firstLine.length > 0 && firstLine.length < 100) {
      nameMatch = [firstLine, firstLine];
    }
  }

  // Extract category from the category list if found
  const category = catMatch ? catMatch[1].trim() : "Other";
  // Normalize category to match our list
  const normalizedCategory = CATEGORIES.find(
    (cat) => cat.toLowerCase() === category.toLowerCase()
  ) || "Other";

  return {
    name: nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, '') : "Unnamed Item",
    description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : text.substring(0, 200) || "No description available",
    category: normalizedCategory,
  };
}

