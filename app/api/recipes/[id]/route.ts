// app/api/recipes/[id]/route.ts
// Handles:
//   GET    /api/recipes/42  → return one recipe
//   DELETE /api/recipes/42  → delete it

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const recipe = await db.recipe.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        ingredients: true,
        steps: { orderBy: { order: "asc" } },
        labels: true,
      },
    });
    if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(recipe);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch recipe" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.recipe.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
