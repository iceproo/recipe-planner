// lib/types.ts
// Shared data shapes used across the app.
// TypeScript uses these to catch mistakes before you run the code.

export type Ingredient = {
  amount: string;
  unit: string;
  name: string;
};

export type RecipeData = {
  title: string;
  description: string;
  cook_time_minutes: number | null;
  servings: string;
  ingredients: Ingredient[];
  steps: string[];
  labels: string[];
  source: "schema" | "ai" | "manual";
  sourceUrl?: string;
};
