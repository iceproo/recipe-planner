// app/import/page.tsx
// Import page — two modes: URL import and manual form.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeData } from "@/lib/types";

type Status = { type: "loading" | "error" | "success"; message: string } | null;

// ---- Small tag input component ----
function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = (v: string) => {
    const tag = v.trim().toLowerCase();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput("");
  };
  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "0.4rem",
      padding: "0.5rem", border: "1px solid #e0ddd6", borderRadius: "8px",
      background: "#faf9f6", marginBottom: "1rem", minHeight: "42px", alignItems: "center"
    }}>
      {value.map((t) => (
        <span key={t} style={{
          display: "inline-flex", alignItems: "center", gap: "0.25rem",
          background: "#2d2d2a", color: "#fff", fontSize: "0.75rem",
          padding: "2px 8px 2px 10px", borderRadius: "99px"
        }}>
          {t}
          <button onClick={() => remove(t)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 0 }}>×</button>
        </span>
      ))}
      <input
        value={input}
        placeholder={value.length ? "" : "pasta, chicken, vego… press Enter"}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && input.trim()) { e.preventDefault(); add(input); }
          if (e.key === "Backspace" && !input && value.length) remove(value[value.length - 1]);
        }}
        onBlur={() => input.trim() && add(input)}
        style={{ border: "none", background: "transparent", outline: "none", fontSize: "0.85rem", minWidth: "80px", flex: 1, padding: "0.1rem 0", marginBottom: 0 }}
      />
    </div>
  );
}

// ---- Recipe preview card ----
function RecipePreview({ recipe }: { recipe: RecipeData }) {
  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <span className={`source-badge badge-${recipe.source}`}>
        {recipe.source === "schema" ? "✓ JSON-LD schema" : recipe.source === "ai" ? "✦ AI extracted" : "Manual"}
      </span>
      <h2 style={{ marginBottom: "0.4rem" }}>{recipe.title}</h2>
      {recipe.description && <p style={{ color: "#666", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{recipe.description}</p>}
      <div className="meta-row">
        {recipe.cook_time_minutes && <span className="meta-pill">⏱ {recipe.cook_time_minutes} min</span>}
        {recipe.servings && <span className="meta-pill">🍽 {recipe.servings}</span>}
        {recipe.labels.slice(0, 5).map((l) => <span key={l} className="meta-pill">{l}</span>)}
      </div>
      {recipe.ingredients.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h3>Ingredients</h3>
          {recipe.ingredients.map((ing, i) => (
            <span key={i} className="ingredient-chip">
              {(ing.amount || ing.unit) && <span className="amount">{[ing.amount, ing.unit].filter(Boolean).join(" ")}</span>}
              {ing.name}
            </span>
          ))}
        </div>
      )}
      {recipe.steps.length > 0 && (
        <div>
          <h3>Steps</h3>
          {recipe.steps.map((step, i) => (
            <div key={i} className="step-item">
              <div className="step-num">{i + 1}</div>
              <div>{step}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Main import page ----
export default function ImportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"url" | "manual">("url");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [preview, setPreview] = useState<RecipeData | null>(null);
  const [saving, setSaving] = useState(false);

  // Manual form state
  const [form, setForm] = useState<RecipeData>({
    title: "", description: "", cook_time_minutes: null, servings: "",
    ingredients: [{ amount: "", unit: "", name: "" }],
    steps: [""], labels: [], source: "manual"
  });

  // ---- URL import ----
  const handleImport = async () => {
    if (!url.trim()) return;
    setStatus({ type: "loading", message: "Fetching page and looking for JSON-LD schema..." });
    setPreview(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setPreview({ ...data, sourceUrl: url });
      setStatus({ type: "success", message: `Extracted via ${data.method}` });
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Failed" });
    }
  };

  // ---- Save to database ----
  const handleSave = async (recipe: RecipeData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push("/"); // go back to home page after saving
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Save failed" });
      setSaving(false);
    }
  };

  // ---- Manual form helpers ----
  const updateIng = (i: number, field: string, val: string) => {
    const updated = [...form.ingredients];
    updated[i] = { ...updated[i], [field]: val };
    setForm((f) => ({ ...f, ingredients: updated }));
  };
  const updateStep = (i: number, val: string) => {
    const updated = [...form.steps];
    updated[i] = val;
    setForm((f) => ({ ...f, steps: updated }));
  };

  return (
    <div>
      <h1 style={{ marginBottom: "0.25rem" }}>Import Recipe</h1>
      <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        From a URL or add manually
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", border: "1px solid #e0ddd6", borderRadius: "10px", overflow: "hidden", marginBottom: "1.5rem", background: "#eeece7" }}>
        {(["url", "manual"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setPreview(null); setStatus(null); }}
            style={{
              flex: 1, padding: "0.6rem", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.85rem", fontWeight: 500, borderRadius: "8px", margin: "3px",
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? "#1a1a18" : "#888",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>
            {t === "url" ? "Import from URL" : "Enter manually"}
          </button>
        ))}
      </div>

      {/* ---- URL TAB ---- */}
      {tab === "url" && (
        <div>
          <div className="card">
            <label>Recipe URL</label>
            <input type="url" value={url} placeholder="https://www.ica.se/recept/..."
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImport()} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-primary" onClick={handleImport}
                disabled={status?.type === "loading" || !url.trim()}>
                {status?.type === "loading" && <span className="spinner" />}
                {status?.type === "loading" ? "Importing..." : "Import recipe"}
              </button>
              {url && <button className="btn btn-ghost" onClick={() => { setUrl(""); setStatus(null); setPreview(null); }}>Clear</button>}
            </div>
            <p style={{ fontSize: "0.75rem", color: "#bbb", marginTop: "0.75rem" }}>
              Works with: ica.se, arla.se, koket.se, tasteline.com, allrecipes.com and more
            </p>
          </div>

          {status && (
            <div className={`status status-${status.type}`}>
              {status.type === "loading" && <span className="spinner" />}
              {status.type === "success" ? "✓" : status.type === "error" ? "✕" : null}
              {status.message}
            </div>
          )}

          {preview && (
            <>
              <RecipePreview recipe={preview} />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                <button className="btn btn-primary" onClick={() => handleSave(preview)} disabled={saving}>
                  {saving && <span className="spinner" />}
                  {saving ? "Saving..." : "Save recipe"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- MANUAL TAB ---- */}
      {tab === "manual" && (
        <div>
          <div className="card">
            <label>Title</label>
            <input type="text" value={form.title} placeholder="e.g. Pasta Carbonara"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />

            <label>Description</label>
            <textarea value={form.description} placeholder="Short description..."
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label>Cook time (minutes)</label>
                <input type="number" value={form.cook_time_minutes ?? ""} placeholder="30"
                  onChange={(e) => setForm((f) => ({ ...f, cook_time_minutes: e.target.value ? parseInt(e.target.value) : null }))} />
              </div>
              <div>
                <label>Servings</label>
                <input type="text" value={form.servings} placeholder="4"
                  onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))} />
              </div>
            </div>

            <label>Labels</label>
            <TagInput value={form.labels} onChange={(labels) => setForm((f) => ({ ...f, labels }))} />

            <label>Ingredients</label>
            <div style={{ display: "grid", gridTemplateColumns: "80px 80px 1fr auto", gap: "0.4rem", marginBottom: "0.25rem" }}>
              {["Amount", "Unit", "Ingredient", ""].map((h) => (
                <span key={h} style={{ fontSize: "0.7rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
              ))}
            </div>
            {form.ingredients.map((ing, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 80px 1fr auto", gap: "0.4rem", marginBottom: "0.4rem" }}>
                <input type="text" value={ing.amount} placeholder="200" style={{ marginBottom: 0 }} onChange={(e) => updateIng(i, "amount", e.target.value)} />
                <input type="text" value={ing.unit} placeholder="g" style={{ marginBottom: 0 }} onChange={(e) => updateIng(i, "unit", e.target.value)} />
                <input type="text" value={ing.name} placeholder="pasta" style={{ marginBottom: 0 }} onChange={(e) => updateIng(i, "name", e.target.value)} />
                <button onClick={() => setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))}
                  disabled={form.ingredients.length === 1}
                  style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: "1.1rem" }}>×</button>
              </div>
            ))}
            <button className="btn btn-ghost" style={{ fontSize: "0.8rem", marginBottom: "1rem" }}
              onClick={() => setForm((f) => ({ ...f, ingredients: [...f.ingredients, { amount: "", unit: "", name: "" }] }))}>
              + Add ingredient
            </button>

            <label>Steps</label>
            {form.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                <div className="step-num" style={{ marginTop: "0.6rem" }}>{i + 1}</div>
                <textarea value={step} placeholder={`Step ${i + 1}...`} rows={2}
                  style={{ flex: 1, marginBottom: 0 }} onChange={(e) => updateStep(i, e.target.value)} />
                <button onClick={() => setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))}
                  disabled={form.steps.length === 1}
                  style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: "1.1rem", marginTop: "0.5rem" }}>×</button>
              </div>
            ))}
            <button className="btn btn-ghost" style={{ fontSize: "0.8rem", marginTop: "0.25rem", marginBottom: "1.25rem" }}
              onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, ""] }))}>
              + Add step
            </button>

            {status?.type === "error" && (
              <div className="status status-error">✕ {status.message}</div>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-primary"
                onClick={() => handleSave({ ...form, ingredients: form.ingredients.filter((i) => i.name.trim()), steps: form.steps.filter((s) => s.trim()) })}
                disabled={saving || !form.title.trim()}>
                {saving && <span className="spinner" />}
                {saving ? "Saving..." : "Save recipe"}
              </button>
              <button className="btn btn-ghost"
                onClick={() => setForm({ title: "", description: "", cook_time_minutes: null, servings: "", ingredients: [{ amount: "", unit: "", name: "" }], steps: [""], labels: [], source: "manual" })}>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
