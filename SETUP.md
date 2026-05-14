# Recipe App — Setup Guide
## Windows + VS Code + Neon + Vercel

---

## What you're building

```
Your computer (VS Code)
       │  git push
       ▼
   GitHub repo
       │  auto-deploy
       ▼
   Vercel (hosts the app, always online)
       │  reads/writes data
       ▼
   Neon (free PostgreSQL database in the cloud)
```

---

## Part 1 — Install prerequisites (one-time)

### 1. Node.js
Download and install from https://nodejs.org — choose the **LTS** version.
After installing, open a terminal in VS Code (`Ctrl + \``) and verify:
```
node --version    ← should print v20.x or higher
npm --version     ← should print 10.x or higher
```

### 2. Git
Download from https://git-scm.com/download/win
During install, choose "Git from the command line and also from 3rd-party software".

### 3. GitHub account
Create one at https://github.com if you don't have one.

---

## Part 2 — Set up the database (Neon)

Neon is a free cloud PostgreSQL database. No credit card needed.

1. Go to https://neon.tech and sign up (use GitHub login for convenience)
2. Click **New Project**, give it a name like `recipe-app`
3. Choose **Region: Europe (Frankfurt)** for low latency from Sweden
4. After creation, find the **Connection string** — it looks like:
   ```
   postgresql://isak:AbCdEf123@ep-something.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
5. Copy it — you'll need it in Part 4

---

## Part 3 — Get an Anthropic API key

The AI fallback uses Claude to extract recipes when JSON-LD isn't found.

1. Go to https://console.anthropic.com
2. Sign in and go to **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-...`) — you only see it once

> **Cost:** Very cheap. Extracting one recipe uses ~2000 tokens ≈ $0.003.

---

## Part 4 — Set up the project locally

### Open VS Code, open a terminal (Ctrl + \`), then:

```bash
# 1. Create the project folder wherever you want your code
#    (e.g. C:\Users\Isak\projects)
cd C:\Users\Isak\projects

# 2. Copy the starter files into a new folder
#    (you can also just manually paste the files from the zip)
mkdir recipe-app
cd recipe-app

# 3. Install dependencies (reads package.json and downloads everything)
npm install

# 4. Open the project in VS Code
code .
```

### Edit the secrets file

Open `.env.local` in VS Code and fill in your values:
```
DATABASE_URL="postgresql://your-neon-connection-string-here"
ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

> ⚠️ `.env.local` is in `.gitignore` — it will NEVER be uploaded to GitHub.
> This keeps your passwords safe.

### Push the database schema to Neon

This creates the tables in your Neon database:
```bash
npm run db:push
```
You should see: `Your database is now in sync with your Prisma schema.`

### Verify with Prisma Studio (optional — visual DB browser)

```bash
npm run db:studio
```
Opens a web UI at http://localhost:5555 where you can see your tables.

---

## Part 5 — Run locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser.
You should see the Recipe App. Try importing a recipe!

The terminal will show you API calls and any errors in real time.

---

## Part 6 — Deploy to Vercel (always-online)

### Step 1: Push your code to GitHub

```bash
# Still inside the recipe-app folder:
git init
git add .
git commit -m "Initial recipe app"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/recipe-app.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to https://vercel.com and sign up with GitHub
2. Click **Add New Project**
3. Import your `recipe-app` repository
4. In the **Environment Variables** section, add:
   - `DATABASE_URL` = your Neon connection string
   - `ANTHROPIC_API_KEY` = your Anthropic key
5. Click **Deploy**

After ~1 minute you get a URL like `recipe-app-isak.vercel.app` — that's your live app!

### Step 3: Future deployments

Every time you push to GitHub, Vercel redeploys automatically:
```bash
git add .
git commit -m "describe what you changed"
git push
```

---

## File structure explained

```
recipe-app/
│
├── app/                        ← All pages and API routes
│   ├── layout.tsx              ← Navigation bar + outer shell (every page)
│   ├── globals.css             ← Styles for the whole app — edit here to restyle
│   ├── page.tsx                ← Home page (recipe list)
│   │
│   ├── import/
│   │   └── page.tsx            ← Import page (URL + manual form)
│   │
│   ├── recipes/[id]/
│   │   └── page.tsx            ← Single recipe detail page
│   │
│   └── api/                    ← Backend API (runs on the server)
│       ├── recipes/
│       │   └── route.ts        ← GET all / POST new recipe
│       ├── recipes/[id]/
│       │   └── route.ts        ← GET one / DELETE one recipe
│       └── import/
│           └── route.ts        ← POST: scrape URL → return recipe data
│
├── lib/                        ← Shared utilities
│   ├── db.ts                   ← Database connection
│   ├── scraper.ts              ← JSON-LD extraction + AI fallback logic
│   └── types.ts                ← TypeScript type definitions
│
├── prisma/
│   └── schema.prisma           ← Database table definitions
│                                 Edit here → run `npm run db:push`
│
├── .env.local                  ← Your secrets (never committed to Git)
├── .gitignore                  ← Files Git should ignore
├── package.json                ← Project dependencies and scripts
└── tsconfig.json               ← TypeScript configuration
```

---

## Common things you'll want to change

| What | Where |
|------|-------|
| App colors, fonts, spacing | `app/globals.css` |
| Navigation links | `app/layout.tsx` |
| Recipe card layout | `app/page.tsx` |
| Recipe detail layout | `app/recipes/[id]/page.tsx` |
| Import form behavior | `app/import/page.tsx` |
| Scraping logic | `lib/scraper.ts` |
| Database columns | `prisma/schema.prisma` → then `npm run db:push` |
| Add a new page | Create `app/your-page/page.tsx` → available at `/your-page` |
| Add a new API endpoint | Create `app/api/your-route/route.ts` → available at `/api/your-route` |

---

## Useful commands

```bash
npm run dev          # Start local development server
npm run build        # Build for production (Vercel does this automatically)
npm run db:push      # Apply schema changes to the database
npm run db:studio    # Open visual database browser
```

---

## Troubleshooting

**`Cannot find module '@prisma/client'`**
→ Run `npm install` then `npm run db:push`

**Database connection error**
→ Check your `DATABASE_URL` in `.env.local` — make sure it's the exact string from Neon

**`Error: API key invalid`**
→ Check your `ANTHROPIC_API_KEY` in `.env.local`

**Port 3000 already in use**
→ Run `npm run dev -- --port 3001` to use a different port

**Changes not showing after editing**
→ Next.js hot-reloads automatically. If it doesn't, stop the server (Ctrl+C) and re-run `npm run dev`
