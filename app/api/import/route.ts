// app/api/import/route.ts
// Handles:
//   POST /api/import   → scrape a URL and return structured recipe data
//
// The frontend calls this first, shows a preview, then the user
// confirms and the frontend calls POST /api/recipes to actually save it.

import { NextResponse } from "next/server";
import { importFromUrl } from "@/lib/scraper";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const recipe = await importFromUrl(url);
    return NextResponse.json(recipe);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
