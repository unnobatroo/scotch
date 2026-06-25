# 🥃 Scotch

A mobile-first web app for learning German — **flashcards** with German-specific
layouts and gender colour-coding, **Notion-style notes** in Markdown, and an
**AI answer-checker** that grades your exercises against a key you provide.

Built to be studied on the go (bus, train, phone) and to grow as a personal
project.

---

## Features

### 🗂️ Flashcards (`/karten`)
- **Decks** of cards you create yourself, with optional images.
- **Noun cards** — three articles + singular/plural, colour-coded by gender:
  - `der` (maskulin) → **blue**
  - `die` (feminin) → **pink-red**
  - `das` (neutrum) → **green**
  - plural-only → **yellow**
- **Verb cards** — the three Stammformen (Infinitiv · Präteritum · Partizip II) plus the auxiliary (haben/sein).
- **Other cards** — free-form front/back.

### 🎯 Study (`/lernen`)
Spaced repetition with the **Leitner system**: correct answers move a card to a
higher box (longer interval); wrong answers send it back to box 1. Study one deck
or all due cards.

### 📝 Notes (`/notizen`)
A lightweight Notion alternative: notes grouped into folders, edited in **Markdown**
with live preview. One-click **import** of your Notion *German Grammar Notes*
(bundled in `lib/seedNotes.js`).

### ✅ Answer-checker (`/pruefen`)
Paste your answers and the official key. A small LLM compares them, identifies the
**Modul / Kapitel / Seite**, shows exactly where you went wrong, explains the rule
in **German**, and links to an article on the topic. Provider is swappable
(see below).

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + API | **Next.js 14** (App Router) on **Vercel** | One language end-to-end; serverless API routes; native Vercel deploy |
| Database / Auth / Storage | **Supabase** (Postgres) | Managed Postgres with built-in auth, file storage and Row-Level Security |
| AI grading | Swappable: **Claude Haiku** (default), **Groq**, **OpenRouter** | Cheap by default; free open-model options; no GPU to host |

---

## Security

- **Row-Level Security** on every table — each user can only read/write rows where
  `user_id = auth.uid()`. Enforced by Postgres, not by app code.
- The Supabase **publishable (anon) key** is the only key in the browser; it is
  safe to expose because RLS protects the data.
- **AI provider API keys live only in server environment variables** and are used
  inside the `/api/grade` route handler. They are never sent to the browser and
  never prefixed with `NEXT_PUBLIC`.
- Image uploads are scoped to a per-user folder in the `card-images` bucket.
- Markdown is sanitised (script/handler/`javascript:` stripping) before render.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in an AI key if you want the grader
npm run dev                  # http://localhost:3000
```

The Supabase URL and publishable key have safe defaults baked in, so the app runs
without any env file — you only need a key for the `/pruefen` grader.

---

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it in Vercel (framework auto-detected as Next.js).
3. Add environment variables (Project → Settings → Environment Variables):
   - `ANTHROPIC_API_KEY` (or `GROQ_API_KEY` / `OPENROUTER_API_KEY`)
   - optionally `ANTHROPIC_MODEL`, etc.
4. Deploy.

Pick the active provider in the app under **⚙︎ Einstellungen**.

---

## Project structure

```
app/
  layout.js            Root layout, auth provider, app frame
  providers.js         Supabase auth context
  components/          AppFrame, Login, CardView, CardForm, MarkdownEditor
  karten/              Flashcards (decks + cards)
  lernen/              Leitner study mode
  notizen/             Markdown notes + groups + Notion import
  pruefen/             AI answer-checker UI
  einstellungen/       Provider settings
  api/grade/route.js   Server-only grading endpoint (provider dispatch)
lib/
  supabase.js          Browser Supabase client
  db.js                Documented data-access helpers
  german.js            Gender colour system + Leitner intervals
  seedNotes.js         Notion grammar notes (importable)
```

---

## Database schema

Tables (all with RLS): `decks`, `cards`, `note_groups`, `notes`, `grader_results`,
plus a public `card-images` storage bucket. See the migration in the Supabase
project `deutsch-study` for the full DDL.

---

_Personal project — built for learning German and for fun._
