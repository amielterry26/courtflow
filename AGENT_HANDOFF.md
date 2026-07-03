# CourtFlow — Agent Handoff Document

> **For any agent reading this:** You are picking up an active project mid-build. Read this entire document before doing anything. You have permission to ask clarifying questions or do a full logic pass before touching code. This document is the single source of truth for context, decisions, and current state.

---

## What Is CourtFlow?

CourtFlow is a **mobile-first basketball training web app** built for two trainers — **Amiel** and **Derek** (Mason & Terry Training). It is not a commercial product. It is an internal tool they use courtside from their phones to manage athletes, build training sessions, and track workouts.

The vibe: fast, simple, no fluff. Built to be used on an iPhone while standing on a basketball court. Every UI decision should reflect that.

---

## The People

| Person | Role |
|--------|------|
| Amiel Terry | Lead trainer, product owner, primary user |
| Derek | Co-trainer, secondary user |
| Parents | View-only — see their kid's profile and upcoming sessions via shareable link |

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | React + Vite 5 |
| Routing | React Router v6 |
| Styling | Tailwind CSS v3 (dark mode via `class` strategy) |
| Backend / DB / Auth | Supabase (Mason & Terry Training project) |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities |
| Deployment | Netlify (manual drag-and-drop of `dist/` for now) |
| Node version | v20.13.1 (this is why we use Vite 5, not Vite 8) |

**Critical:** Do NOT upgrade to Vite 6/7/8 or Tailwind v4. Node 20.13.1 is the active runtime and the newer versions break on it.

---

## Supabase Project

- **Project name:** Mason & Terry Training
- **Reference ID:** `hmqeakjpstjgsdhmtobe`
- **Region:** West US (Oregon)
- **Supabase account:** Second account (not the one with career-control / budget-peace — that one had an overdue invoice)
- **URL:** `https://hmqeakjpstjgsdhmtobe.supabase.co`
- **Anon key:** stored in `.env` as `VITE_SUPABASE_ANON_KEY`
- **JWT expiry:** Should be set to `2592000` (30 days) in Supabase → Auth → Settings

### Database Tables

| Table | Purpose |
|-------|---------|
| `athletes` | All athlete profiles |
| `drills` | The drill library |
| `sessions` | Training sessions |
| `session_athletes` | Join table — which athletes are in which session |
| `session_drills` | Drills inside a session, with order, notes, reps, makes, duration |
| `intake_submissions` | Parent intake form submissions (pending review) |

**Key field:** `athletes.share_token` (UUID) — used to generate parent shareable links. Anyone with the link can view that athlete's profile and sessions. No login required.

Full schema is at: `supabase/migrations/20260703000000_init.sql`

---

## Architecture & Auth Model

### Three access levels:
1. **Trainers (Amiel + Derek):** Email/password Supabase auth. Full CRUD on everything. Accounts created manually in Supabase dashboard → Auth → Users.
2. **Parents (view-only):** No login. Get a shareable link: `/athlete/:share_token`. Can see athlete profile + upcoming sessions only. Cannot see other athletes.
3. **Public (intake form):** No login. Can access `/intake/form` and submit a form. Creates a pending record trainers review.

### RLS (Row Level Security):
- Authenticated users: full access to all tables
- Anon users: can INSERT into `intake_submissions`, can SELECT from `athletes`, `sessions`, `session_athletes`, `session_drills`, `drills` (for the parent view — the share_token acts as the access control)

---

## Project File Structure

```
courtflow/
├── public/
├── src/
│   ├── lib/
│   │   └── supabase.js          # Supabase client (30-day session config)
│   ├── context/
│   │   ├── AuthContext.jsx      # Auth state provider
│   │   └── ThemeContext.jsx     # Light/dark mode (persisted to localStorage)
│   ├── components/
│   │   ├── Layout.jsx           # App shell: top header + bottom tab nav
│   │   └── ProtectedRoute.jsx   # Redirects to /login if not authed
│   ├── pages/
│   │   ├── Login.jsx            # Email/password login
│   │   ├── Today.jsx            # Dashboard — today's sessions
│   │   ├── Athletes.jsx         # Athlete list with search
│   │   ├── AthleteDetail.jsx    # Athlete profile + share link button
│   │   ├── AthleteForm.jsx      # Create / edit athlete
│   │   ├── AthletePublicView.jsx # Parent-facing view at /athlete/:token
│   │   ├── Drills.jsx           # Drill library with category filter
│   │   ├── DrillForm.jsx        # Create / edit / delete drill
│   │   ├── Sessions.jsx         # Session list grouped by date
│   │   ├── SessionDetail.jsx    # Session view + drill builder (drag & drop)
│   │   ├── SessionForm.jsx      # Create / edit session + athlete picker
│   │   ├── Intake.jsx           # Trainer intake review panel
│   │   └── IntakeForm.jsx       # Public parent intake form
│   ├── App.jsx                  # Router (public + protected routes)
│   ├── main.jsx                 # Entry point
│   └── index.css                # Tailwind base import
├── supabase/
│   └── migrations/
│       └── 20260703000000_init.sql
├── index.html                   # Viewport meta (mobile-locked)
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── netlify.toml                 # Build: npm run build, publish: dist, SPA redirect
├── .env                         # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (not in git)
└── .env.example                 # Template for env vars
```

---

## Features Built (Complete)

### ✅ Authentication
- Email/password login via Supabase Auth
- Sessions persist 30 days (JWT expiry set in Supabase dashboard, `persistSession: true` in client)
- `autoRefreshToken: true` — token silently refreshes, no re-login needed

### ✅ Today View (`/`)
- Shows all sessions scheduled for today
- Each card: session title, time, athlete tags, ordered drill list, notes
- Empty state with link to create a session

### ✅ Athletes (`/athletes`)
- Searchable list of all active athletes
- Avatar initials, skill level badge, position/school info
- Create / edit / delete via form

### ✅ Athlete Detail (`/athletes/:id`)
- Full profile view
- Info grid: age, grade, team, fav player, parent contact
- Development section: goals, strengths, weaknesses, notes
- Upcoming sessions list
- **"Copy parent share link"** button — copies `/athlete/:share_token` to clipboard

### ✅ Drill Library (`/drills`)
- Searchable + filterable by category
- Categories: ball handling, shooting, finishing, footwork, defense, conditioning, IQ, warmup
- Difficulty badges: beginner / intermediate / advanced
- Create / edit / delete

### ✅ Sessions (`/sessions`)
- List grouped by date (newest first)
- Shows time, athlete tags, drill count per session

### ✅ Session Builder (`/sessions/:id`)
- Add drills from the library via bottom-sheet picker (with search)
- Drag and drop to reorder drills (dnd-kit)
- Expand each drill to set: duration (min), target reps, target makes, custom coaching notes
- Changes persist to Supabase in real time

### ✅ Intake Form (`/intake/form`) — PUBLIC
- No login required
- Parent fills out: child name, age, grade, school, team, skill level, goals, strengths, weaknesses, parent name/phone/email
- On submit: creates a record in `intake_submissions`
- Success screen: "You're on deck!" with personalized message

### ✅ Intake Review (`/intake`) — TRAINER ONLY
- Shows pending vs reviewed submissions
- Expand a card to see all details
- **Approve → Athlete**: one-tap converts submission to a real athlete profile
- **Dismiss**: marks as reviewed without creating athlete

### ✅ Parent Share View (`/athlete/:token`)
- Public — no login
- Shows athlete name, position, school, skill level, goals
- Lists upcoming sessions with ordered drills, duration, coaching notes
- "Powered by CourtFlow" footer

### ✅ Light / Dark Mode
- Toggle in top nav bar
- Persisted to `localStorage`
- Respects system preference on first load

### ✅ Mobile Viewport Fix
- `maximum-scale=1.0, user-scalable=no` prevents iOS auto-zoom
- `apple-mobile-web-app-capable` meta tag set

---

## Deployment

- **Platform:** Netlify
- **Live URL:** `https://rad-chaja-b7245c.netlify.app`
- **Build command:** `npm run build`
- **Publish dir:** `dist`
- **SPA redirect:** `netlify.toml` handles `/* → /index.html` (required for React Router)
- **Env vars on Netlify:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be set in Netlify site settings → environment variables (they get baked in at build time)
- **Deploy method:** Currently manual drag-and-drop of `dist/` folder. No CI/CD yet.

---

## Where We Stopped

The last two things completed before this handoff:

1. **Mobile viewport fix** — `index.html` updated with `maximum-scale=1.0` and Apple meta tags to stop iOS zoom/scroll weirdness
2. **30-day auth sessions** — `supabase.js` updated with `persistSession: true`, `autoRefreshToken: true`

**The build was clean (`npm run build` passes). The dist was NOT redeployed to Netlify yet after these two fixes.**

**TODO before next session starts:**
- [ ] Redeploy `dist/` to Netlify (drag and drop)
- [ ] Verify mobile zoom is fixed on iPhone
- [ ] Verify login persists after closing the browser
- [ ] Create trainer accounts for Amiel and Derek in Supabase → Auth → Users
- [ ] Set JWT expiry to `2592000` in Supabase → Auth → Settings (if not done)

---

## Known Issues / Things to Fix

1. **No CI/CD** — Every deploy is manual. Should connect Netlify to a GitHub repo so every push auto-deploys. The repo doesn't exist yet.
2. **Drill detail page missing** — `/drills/:id` currently routes to `DrillForm` (edit). There's no read-only drill detail view. Fine for now but worth adding.
3. **No loading skeletons** — Pages show "Loading..." text. Could be improved with skeleton cards on a future pass.
4. **Bundle size warning** — Vite warns about the 551KB bundle. Not a problem now but could code-split by route later.
5. **No error boundaries** — If Supabase is down or a query fails, the UI can silently break. Could wrap pages in error boundaries.
6. **Intake form: multiple kids** — A parent with 2 kids has to submit the form twice. This is intentional for now (keeps it simple) but could add "add another child" flow later.
7. **No push notifications** — Parents have no way to be notified when a session is scheduled. Future feature.
8. **No offline support** — App requires internet. Fine for now (courtside = usually has signal), but a future PWA pass could add basic offline caching.

---

## Key Decisions Made (And Why)

| Decision | Reason |
|----------|--------|
| No Google OAuth | Only 2 users, overkill, email/password is fine |
| Parent share links (no parent accounts) | Simpler, zero friction, works like a Google Doc share link |
| All athletes share the same drill list in a session | Baseline simplicity — trainers are skilled enough to adjust on the fly |
| Vite 5 not Vite 8 | Node 20.13.1 doesn't support Vite 8's rolldown bundler |
| Tailwind v3 not v4 | Same reason — v4 uses the `@tailwindcss/vite` plugin which needs newer Node |
| One form per intake (not multi-child) | Keeps the form fast and simple for parents filling it out on their phone |
| Tags dropped from drills | Category field is enough for filtering. Tags added unnecessary complexity |
| Video URL dropped from drills | Nice-to-have, not needed for v1. Add in a future sprint |

---

## Future Features (Backlog)

These were discussed but intentionally left out of v1:

- **Per-athlete drill customization within a session** — Right now all athletes get the same drills. Future: ability to branch per athlete.
- **Parent accounts** — If the share link model feels insufficient, add Supabase auth for parents tied to their kid's athlete record.
- **Video drill demonstrations** — `drills.video_url` field exists in the schema but is not used in the UI yet.
- **Session templates** — Save a session as a template and reuse it.
- **Progress tracking** — Log what actually happened in a session vs what was planned (makes vs target makes, etc.).
- **Push notifications to parents** — "Session scheduled for Friday at 4pm"
- **CI/CD via GitHub** — Connect Netlify to GitHub so `git push` auto-deploys
- **PWA / offline mode** — Add a service worker for basic offline support
- **Custom domain** — Replace `rad-chaja-b7245c.netlify.app` with something like `courtflow.app` or `masonterrytraining.com`

---

## Agent Instructions

If you are an AI agent reading this to pick up where we left off:

1. **Read this whole document first.** Don't skip to the code.
2. **Check the "Where We Stopped" section** — that's your immediate to-do list.
3. **Ask questions if anything is unclear** before writing code. Amiel communicates via voice notes (transcribed) — be ready for stream-of-consciousness input and pull out the intent.
4. **Do a logic pass** if you're about to touch auth, RLS policies, or the session builder — these are the most complex parts.
5. **Don't over-engineer.** This is an internal tool for 2 people. Simple > clever.
6. **Mobile first, always.** Every UI element should be designed for a phone screen first. Amiel uses this courtside.
7. **Test the build** (`npm run build`) before declaring anything done.
8. **The `.env` file is not in git.** You'll need the Supabase URL and anon key. Check with Amiel or look them up in the Supabase dashboard for project `hmqeakjpstjgsdhmtobe`.
