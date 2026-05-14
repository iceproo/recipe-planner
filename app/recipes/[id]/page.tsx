// app/recipes/[id]/page.tsx
// Shows one recipe in full detail.
// [id] is a dynamic segment — /recipes/5 renders this page with id="5"

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type FullRecipe = {
  id: number;
  title: string;
  description: string | null;
  cookTime: number | null;
  servings: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
  createdAt: string;
  ingredients: { id: number; amount: string | null; unit: string | null; name: string }[];
  steps: { id: number; order: number; text: string }[];
  labels: { id: number; name: string }[];
};

export default function RecipePage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<FullRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((data) => { setRecipe(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this recipe?")) return;
    setDeleting(true);
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    router.push("/");
  };

  if (loading) return (
    <div style={{ textAlign: "center", marginTop: "3rem", color: "#888" }}>
      <div className="spinner" style={{ margin: "0 auto 1rem" }} />
      Loading...
    </div>
  );

  if (!recipe) return (
    <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
      <p style={{ color: "#888" }}>Recipe not found.</p>
      <Link href="/" className="btn btn-ghost" style={{ marginTop: "1rem" }}>← Back</Link>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <Link href="/" style={{ color: "#888", fontSize: "0.875rem", textDecoration: "none" }}>← All recipes</Link>
        <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      {/* Title & meta */}
      <div className="card">
        <span className={`source-badge badge-${recipe.sourceType}`}>
          {recipe.sourceType === "schema" ? "JSON-LD" : recipe.sourceType === "ai" ? "AI extracted" : "Manual"}
        </span>
        <h1 style={{ marginBottom: "0.5rem" }}>{recipe.title}</h1>
        {recipe.description && (
          <p style={{ color: "#555", marginBottom: "0.75rem", lineHeight: 1.6 }}>{recipe.description}</p>
        )}

        <div className="meta-row">
          {recipe.cookTime && <span className="meta-pill">⏱ {recipe.cookTime} min</span>}
          {recipe.servings && <span className="meta-pill">🍽 {recipe.servings} servings</span>}
          {recipe.labels.map((l) => <span key={l.id} className="meta-pill">{l.name}</span>)}
        </div>

        {recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.8rem", color: "#b5a98f", wordBreak: "break-all" }}>
            🔗 {recipe.sourceUrl}
          </a>
        )}
      </div>

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <div className="card">
          <h3>Ingredients</h3>
          {recipe.ingredients.map((ing) => (
            <div key={ing.id} style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", padding: "0.4rem 0", borderBottom: "1px solid #f5f3ee" }}>
              <span style={{ fontWeight: 500, color: "#b5a98f", minWidth: "80px", fontSize: "0.875rem" }}>
                {[ing.amount, ing.unit].filter(Boolean).join(" ") || "—"}
              </span>
              <span style={{ fontSize: "0.9rem" }}>{ing.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <div className="card">
          <h3>Instructions</h3>
          {recipe.steps.map((step, i) => (
            <div key={step.id} className="step-item" style={{ marginBottom: "1rem" }}>
              <div className="step-num">{i + 1}</div>
              <div style={{ paddingTop: "1px" }}>{step.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
