// app/api/recipes/route.ts
// Handles:
//   GET  /api/recipes       → returns all saved recipes
//   POST /api/recipes       → saves a new recipe to the database

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RecipeData } from "@/lib/types";

// GET: fetch all recipes (used on the home page)
export async function GET() {
  try {
    const recipes = await db.recipe.findMany({
      include: {
        ingredients: true,
        steps: { orderBy: { order: "asc" } },
        labels: true,
      },
      orderBy: { createdAt: "desc" }, // newest first
    });
    return NextResponse.json(recipes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 });
  }
}

// POST: save a new recipe
export async function POST(request: Request) {
  try {
    const body: RecipeData & { sourceUrl?: string } = await request.json();

    const recipe = await db.recipe.create({
      data: {
        title: body.title,
        description: body.description || null,
        cookTime: body.cook_time_minutes ?? null,
        servings: body.servings || null,
        sourceUrl: body.sourceUrl || null,
        sourceType: body.source,
        // Create nested records in one go
        ingredients: {
          create: body.ingredients.map((ing) => ({
            amount: ing.amount || null,
            unit: ing.unit || null,
            name: ing.name,
          })),
        },
        steps: {
          create: body.steps.map((text, i) => ({
            order: i,
            text,
          })),
        },
        labels: {
          create: body.labels.map((name) => ({ name })),
        },
      },
      // Return the full recipe with relations so the UI can update immediately
      include: { ingredients: true, steps: true, labels: true },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save recipe" }, { status: 500 });
  }
}
