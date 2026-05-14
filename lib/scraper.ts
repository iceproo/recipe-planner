// lib/scraper.ts
// All the recipe-scraping logic lives here.
// Called by the API route at /api/import/route.ts

import { RecipeData } from "./types";

// ----------------------------------------------------------------
// Step 1: Try to find JSON-LD schema data in the page HTML
// Most major recipe sites embed this invisible structured data
// so Google can show recipe cards in search results.
// ----------------------------------------------------------------
function extractJsonLd(html: string): Record<string, unknown> | null {
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Recipe") return item;
        // Some sites wrap it in a @graph array
        if (item["@graph"]) {
          const r = (item["@graph"] as Record<string, unknown>[]).find(
            (n) => n["@type"] === "Recipe"
          );
          if (r) return r;
        }
      }
    } catch {
      // Invalid JSON in this script tag, keep looking
    }
  }
  return null;
}

// ----------------------------------------------------------------
// Parse ISO 8601 duration strings like "PT1H30M" into minutes
// These are used in schema.org for cookTime and totalTime
// ----------------------------------------------------------------
function parseDuration(iso: unknown): number | null {
  if (typeof iso !== "string") return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  return parseInt(m[1] || "0") * 60 + parseInt(m[2] || "0");
}

// ----------------------------------------------------------------
// Map a raw schema.org Recipe object to our app's RecipeData shape
// ----------------------------------------------------------------
function mapSchema(schema: Record<string, unknown>): RecipeData {
  // Ingredients: split "400g spaghetti" into amount/unit/name
  const ingredients = ((schema.recipeIngredient as string[]) || []).map(
    (raw) => {
      const m = raw.match(/^([\d½¼¾⅓⅔.,\/ ]+)?\s*([a-zA-Z]+\b)?\s*(.+)/);
      if (m) {
        return {
          amount: (m[1] || "").trim(),
          unit: (m[2] || "").trim(),
          name: (m[3] || raw).trim(),
        };
      }
      return { amount: "", unit: "", name: raw };
    }
  );

  // Steps: flatten HowToStep and HowToSection structures
  const steps: string[] = [];
  const rawSteps = schema.recipeInstructions || [];
  const flatten = (arr: unknown[]) => {
    for (const s of arr) {
      if (typeof s === "string") steps.push(s);
      else if (s && typeof s === "object") {
        const obj = s as Record<string, unknown>;
        if (obj["@type"] === "HowToStep") steps.push(String(obj.text || obj.name || ""));
        else if (obj["@type"] === "HowToSection" && obj.itemListElement)
          flatten(obj.itemListElement as unknown[]);
      }
    }
  };
  if (typeof rawSteps === "string") steps.push(...rawSteps.split(/\n+/).filter(Boolean));
  else flatten(Array.isArray(rawSteps) ? rawSteps : [rawSteps]);

  // Labels: combine category, cuisine, keywords
  const labels: string[] = [];
  const addLabels = (val: unknown) => {
    if (!val) return;
    const arr = Array.isArray(val) ? val : [val];
    labels.push(...arr.map(String));
  };
  addLabels(schema.recipeCategory);
  addLabels(schema.recipeCuisine);
  if (typeof schema.keywords === "string")
    labels.push(...schema.keywords.split(/,\s*/));

  return {
    title: String(schema.name || ""),
    description: String(schema.description || ""),
    cook_time_minutes:
      parseDuration(schema.cookTime) ?? parseDuration(schema.totalTime),
    servings: String(schema.recipeYield || "").replace(/\D.*/, ""),
    ingredients,
    steps: steps.map((s) => s.trim()).filter(Boolean),
    labels: [...new Set(labels)].filter(Boolean),
    source: "schema",
  };
}

// ----------------------------------------------------------------
// Step 2 (fallback): Use Claude AI to extract recipe from page text
// Used when the site doesn't have JSON-LD, or uses JavaScript
// rendering so the schema isn't in the raw HTML.
// ----------------------------------------------------------------
async function aiExtract(html: string, url: string): Promise<RecipeData> {
  // Strip all HTML tags and collapse whitespace to get readable text
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{3,}/g, "\n")
    .slice(0, 8000); // keep cost low — first 8000 chars has the recipe

  const prompt = `Extract a recipe from this webpage text. Return ONLY a valid JSON object, no markdown fences, no explanation.

URL: ${url}

Page text:
${text}

Return this exact structure:
{
  "title": "...",
  "description": "...",
  "cook_time_minutes": 30,
  "servings": "4",
  "ingredients": [{"amount": "200", "unit": "g", "name": "pasta"}],
  "steps": ["Step 1", "Step 2"],
  "labels": ["pasta", "italian"]
}

Rules:
- ingredients: split into amount (number string), unit (g/dl/msk/tsk/st/krm), name
- steps: one string per step
- cook_time_minutes: number or null
- If unknown, use null or []`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  const raw = data.content.map((b: { text?: string }) => b.text || "").join("");
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  return { ...parsed, source: "ai" as const };
}

// ----------------------------------------------------------------
// Main export: tries JSON-LD first, falls back to AI
// ----------------------------------------------------------------
export async function importFromUrl(url: string): Promise<RecipeData & { method: string }> {
  // Use allorigins as a CORS proxy (same as the prototype artifact)
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error("Failed to fetch URL");
  const { contents: html } = await res.json();
  if (!html) throw new Error("Empty response from proxy");

  const schema = extractJsonLd(html);
  if (schema) {
    return { ...mapSchema(schema), sourceUrl: url, method: "JSON-LD schema" };
  }

  // No schema found — use AI
  const aiResult = await aiExtract(html, url);
  return { ...aiResult, sourceUrl: url, method: "AI extraction" };
}
