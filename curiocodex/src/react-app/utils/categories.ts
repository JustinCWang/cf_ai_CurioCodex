/**
 * Available categories for hobbies and items.
 * Must match the categories defined in the backend (ai.ts).
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

