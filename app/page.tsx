// app/page.tsx
// Home page — shows all saved recipes.
// "use client" means this component runs in the browser (not on the server).
// This lets us use useState, useEffect, and handle clicks.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// The shape of a recipe returned from the database
type Recipe = {
  id: number;
  title: string;
  description: string | null;
  cookTime: number | null;
  servings: string | null;
  sourceType: string | null;
  labels: { id: number; name: string }[];
  ingredients: { id: number }[];
};

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Load recipes from the API when the page loads
  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => { setRecipes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Filter by search term (title or label)
  const filtered = recipes.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.labels.some((l) => l.name.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", color: "#888", marginTop: "3rem" }}>
        <div className="spinner" style={{ margin: "0 auto 1rem" }} />
        Loading recipes...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1>My Recipes</h1>
          <p style={{ color: "#888", fontSize: "0.875rem" }}>
            {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <Link href="/import" className="btn btn-primary">+ Import</Link>
      </div>

      {/* Search box */}
      {recipes.length > 0 && (
        <input
          type="text"
          placeholder="Search by name or label..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "1.25rem" }}
        />
      )}

      {/* Empty state */}
      {recipes.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaa" }}>
          <p style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🍴</p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", marginBottom: "0.5rem", color: "#888" }}>
            No recipes yet
          </p>
          <p style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Import one from a URL or add it manually
          </p>
          <Link href="/import" className="btn btn-primary">Import your first recipe</Link>
        </div>
      )}

      {/* Recipe grid */}
      <div className="recipe-grid">
        {filtered.map((recipe) => (
          <Link key={recipe.id} href={`/recipes/${recipe.id}`} style={{ textDecoration: "none" }}>
            <div className="card" style={{ cursor: "pointer", transition: "box-shadow 0.15s", height: "100%" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
              <span className={`source-badge badge-${recipe.sourceType}`}>
                {recipe.sourceType === "schema" ? "JSON-LD" : recipe.sourceType === "ai" ? "AI" : "Manual"}
              </span>
              <h2 style={{ marginBottom: "0.4rem", fontSize: "1.05rem" }}>{recipe.title}</h2>
              {recipe.description && (
                <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "0.75rem" }}>
                  {recipe.description.slice(0, 90)}{recipe.description.length > 90 ? "…" : ""}
                </p>
              )}
              <div className="meta-row">
                {recipe.cookTime && <span className="meta-pill">⏱ {recipe.cookTime} min</span>}
                {recipe.servings && <span className="meta-pill">🍽 {recipe.servings}</span>}
                {recipe.ingredients.length > 0 && <span className="meta-pill">🥕 {recipe.ingredients.length} ingredients</span>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {recipe.labels.slice(0, 4).map((l) => (
                  <span key={l.id} className="meta-pill" style={{ fontSize: "0.75rem" }}>{l.name}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
