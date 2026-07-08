# CourtFlow — Agent Handoff Document

> **For any agent reading this:** You are picking up an active project mid-build. Read this entire document before doing anything. You have permission to ask clarifying questions or do a full logic pass before touching code. This document is the single source of truth for context, decisions, and current state. If something is unclear, ask Amiel — he communicates via voice notes (stream-of-consciousness), so read through and pull out the intent.

---

## What Is CourtFlow?

CourtFlow is a **mobile-first basketball training web app** built for two trainers — **Amiel Terry** and **Derek** (Mason & Terry Training). It is not a commercial product. It is an internal tool they use courtside from their phones to manage athletes, build training sessions, and track workouts.

The vibe: fast, simple, no fluff. Built to be used on an iPhone while standing on a basketball court. Every UI decision should reflect that. Simple > clever. Mobile first, always.

---

## The People

| Person | Role |
|--------|------|
| Amiel Terry | Lead trainer, product owner, primary user (`amielterry.dev@gmail.com`) |
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
| Email notifications | Web3Forms (client-side fetch, no SDK) |
| Deployment | Netlify (manual drag-and-drop of `dist/` for now) |
| Node version | v20.13.1 |

**CRITICAL — Do NOT upgrade:**
- Vite past v5 (Vite 6/7/8 breaks on Node 20.13.1)
- Tailwind past v3 (v4 uses `@tailwindcss/vite` which needs newer Node)

---

## Supabase Project

- **Project name:** Mason & Terry Training
- **Reference ID:** `hmqeakjpstjgsdhmtobe`
- **Region:** West US (Oregon)
- **URL:** `https://hmqeakjpstjgsdhmtobe.supabase.co`
- **Anon key:** stored in `.env` as `VITE_SUPABASE_ANON_KEY`
- **JWT expiry:** Should be set to `2592000` (30 days) in Supabase → Auth → Settings
- **Signups:** Should be DISABLED in Supabase → Auth → Settings (only Amiel and Derek should have accounts, created manually)

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

Full schema: `supabase/migrations/20260703000000_init.sql`

### RLS Summary
- Authenticated users: full CRUD on all tables
- Anon users: INSERT into `intake_submissions`, SELECT from `athletes`, `sessions`, `session_athletes`, `session_drills`, `drills` (share_token is the access control for the parent view)

---

## Architecture & Auth Model

### Three access levels:
1. **Trainers (Amiel + Derek):** Email/password Supabase auth. Full CRUD. Accounts created manually in Supabase Dashboard → Auth → Users.
2. **Parents (view-only):** No login. Get a shareable link: `/athlete/:share_token`. Can see athlete profile + upcoming sessions only.
3. **Public (intake form):** No login. Can access `/intake/form` and submit. Creates a pending record trainers review in the app.

### Auth persistence:
- `supabase.js` uses `persistSession: true`, `autoRefreshToken: true`, `storageKey: 'courtflow-auth'`
- Session is stored in localStorage. Once logged in on a device, the trainer stays logged in indefinitely (refresh token auto-renews on use)
- Login page redirects home if a session already exists — trainers should never see the login screen after their first login on a device

---

## Project File Structure

```
courtflow/
├── public/
├── src/
│   ├── lib/
│   │   └── supabase.js          # Supabase client (30-day session, auto-refresh)
│   ├── context/
│   │   ├── AuthContext.jsx      # Auth state provider
│   │   └── ThemeContext.jsx     # Light/dark mode (persisted to localStorage)
│   ├── components/
│   │   ├── Layout.jsx           # App shell: top header + bottom tab nav
│   │   └── ProtectedRoute.jsx   # Redirects to /login if not authed
│   ├── pages/
│   │   ├── Login.jsx            # Email/password login (auto-redirects home if already authed)
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
│   │   └── IntakeForm.jsx       # Public parent intake form (+ Web3Forms email notification)
│   ├── App.jsx                  # Router (public + protected routes)
│   ├── main.jsx                 # Entry point
│   └── index.css                # Tailwind base import
├── supabase/
│   └── migrations/
│       └── 20260703000000_init.sql
├── index.html                   # Viewport meta (mobile-locked, Apple PWA tags)
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── netlify.toml                 # Build: npm run build, publish: dist, SPA redirect
├── .env                         # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_WEB3FORMS_KEY
└── .env.example                 # Template for env vars
```

### Routing (App.jsx)
Public routes (no auth required):
- `/login` — trainer login
- `/intake/form` — parent-facing intake form
- `/athlete/:token` — parent-facing athlete view

Protected routes (all wrapped in `ProtectedRoute`, redirects to `/login` if not authed):
- `/` — Today view
- `/athletes`, `/athletes/new`, `/athletes/:id`, `/athletes/:id/edit`
- `/drills`, `/drills/new`, `/drills/:id`
- `/sessions`, `/sessions/new`, `/sessions/:id`, `/sessions/:id/edit`
- `/intake` — trainer intake review

---

## Features Built (Complete)

### ✅ Authentication
- Email/password login via Supabase Auth
- Sessions persist indefinitely via auto-refresh (JWT expiry 30 days, `autoRefreshToken: true`)
- Login page auto-redirects home if already authenticated
- No signup on the login page — accounts are created manually only

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
- "Copy parent share link" button — copies `/athlete/:share_token` to clipboard

### ✅ Drill Library (`/drills`)
- Searchable + filterable by category
- Categories: ball handling, shooting, finishing, footwork, defense, conditioning, IQ, warmup
- Difficulty badges: beginner / intermediate / advanced
- Create / edit / delete

### ✅ Sessions (`/sessions`)
- List grouped by date (newest first)
- Shows time, athlete tags, drill count per session

### ✅ Session Builder (`/sessions/:id`)
- Add drills from library via bottom-sheet picker (with search)
- Drag and drop to reorder drills (dnd-kit)
- Expand each drill to set: duration (min), target reps, target makes, custom coaching notes
- Changes persist to Supabase in real time

### ✅ Intake Form (`/intake/form`) — PUBLIC
- No login required
- Parent fills out: child name, age, grade, school, team, skill level, goals, strengths, weaknesses, parent name/phone/email
- On submit: saves to `intake_submissions` in Supabase
- After save: fires a Web3Forms notification email to Amiel (and Derek once his email is added — see pending items)
- Email is best-effort — if it fails, the DB submission still succeeds
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

### ✅ Intake Email Notifications (Web3Forms)
- After a successful intake form submission, a formatted email is sent via Web3Forms
- No SDK — just a `fetch` POST to `https://api.web3forms.com/submit`
- Access key stored in `.env` as `VITE_WEB3FORMS_KEY`
- Must also be set in Netlify environment variables (baked in at build time)

---

## Deployment

- **Platform:** Netlify
- **Live URL:** `https://rad-chaja-b7245c.netlify.app`
- **GitHub repo:** `https://github.com/amielterry26/courtflow`
- **Build command:** `npm run build`
- **Publish dir:** `dist`
- **SPA redirect:** `netlify.toml` handles `/* → /index.html` (required for React Router)
- **Env vars on Netlify:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WEB3FORMS_KEY` must all be set in Netlify site settings → Environment Variables (they get baked in at build time)
- **Deploy method:** Currently manual drag-and-drop of `dist/` folder. No CI/CD yet.

---

## Where We Stopped (Session 2 — 2026-07-07)

### What was completed this session:
1. **Persistent login** — Login page now auto-redirects home if a session already exists. Trainers log in once per device and never see the login screen again.
2. **Intake email notifications** — Web3Forms integrated into `IntakeForm.jsx`. On every submission, a formatted email fires to Amiel's email (`amielterry.dev@gmail.com`). Web3Forms access key is in `.env`.
3. **EmailJS was evaluated and rejected** — too many setup steps. Web3Forms was chosen instead (simpler, no SDK, one key, one fetch call).
4. **Confirmed route security** — All trainer routes are behind `ProtectedRoute`. The concern about someone navigating from the intake form URL to protected pages is already handled — they'd hit the login wall.

### Pending manual steps (Amiel needs to do these):
- [ ] **Supabase:** Create accounts for Amiel and Derek in Supabase → Auth → Users
- [ ] **Supabase:** Set JWT expiry to `2592000` in Supabase → Auth → Settings
- [ ] **Supabase:** Disable "Enable Sign Ups" in Supabase → Auth → Settings
- [ ] **Web3Forms:** Add `VITE_WEB3FORMS_KEY=527c9017-ad35-4337-9000-9515c906e162` to Netlify → Site Settings → Environment Variables
- [ ] **Derek's email:** Provide Derek's email so it can be added as a CC to the Web3Forms notification
- [ ] **Redeploy:** Run `npm run build` and drag `dist/` to Netlify after Netlify env var is added

### Next pending feature (not started yet):
- Add Derek's email to the intake notification email (once his address is known — pass as `cc` in the Web3Forms payload)

---

## Known Issues / Backlog

| # | Issue | Priority |
|---|-------|----------|
| 1 | No CI/CD — every deploy is manual drag-and-drop | Medium |
| 2 | No drill detail read-only page — `/drills/:id` routes to edit form | Low |
| 3 | No loading skeletons — pages show "Loading..." text | Low |
| 4 | 555KB bundle size warning from Vite | Low |
| 5 | No error boundaries — silent failures if Supabase is down | Low |
| 6 | Intake form is single-child only (one form per kid) | Intentional for v1 |
| 7 | No push notifications to parents for new sessions | Future |
| 8 | No offline/PWA support | Future |
| 9 | Derek's email not yet added to intake notifications | Blocked on Derek's email |

---

## Key Decisions Made (And Why)

| Decision | Reason |
|----------|--------|
| No Google OAuth | Only 2 users — email/password is simpler |
| Parent share links, no parent accounts | Zero friction — works like a Google Doc share link |
| No CI/CD yet | Manual deploys are fine for now, no urgency |
| Vite 5, not Vite 6/7/8 | Node 20.13.1 breaks rolldown bundler in newer Vite |
| Tailwind v3, not v4 | Same Node version constraint |
| Web3Forms over EmailJS | EmailJS required too many setup steps (service, template, multiple IDs). Web3Forms is one key, one fetch. |
| Email notifications are best-effort | DB save is the source of truth. If email fails, the submission is still in Supabase and visible in the intake review panel. |
| Tags dropped from drills | Category field is enough for filtering |
| Video URL dropped from drills | `drills.video_url` field exists in schema but not used in UI yet |
| One form per intake (not multi-child) | Keeps the form fast and simple on a phone |
| All athletes share the same drills in a session | Simplicity — trainers adjust on the fly |

---

## Future Features (Backlog)

These were discussed but intentionally left out of v1:

- **Per-athlete drill customization within a session** — right now all athletes get the same drills. Future: branch per athlete.
- **Session templates** — save a session as a template and reuse it.
- **Progress tracking** — log what actually happened (makes vs target makes, etc.).
- **Parent accounts** — if share links feel insufficient, add Supabase auth for parents tied to their kid's record.
- **Video drill demonstrations** — `drills.video_url` field exists in the DB, just needs UI.
- **Push notifications to parents** — "Session scheduled for Friday at 4pm."
- **CI/CD via GitHub** — connect Netlify to GitHub so `git push` auto-deploys.
- **PWA / offline mode** — service worker for basic offline support courtside.
- **Custom domain** — replace `rad-chaja-b7245c.netlify.app` with something like `courtflow.app`.

---

## Environment Variables Reference

| Variable | Where used | Notes |
|----------|-----------|-------|
| `VITE_SUPABASE_URL` | `src/lib/supabase.js` | `https://hmqeakjpstjgsdhmtobe.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.js` | Supabase anon key — safe to expose in client |
| `VITE_WEB3FORMS_KEY` | `src/pages/IntakeForm.jsx` | `527c9017-ad35-4337-9000-9515c906e162` — Web3Forms access key, designed to be public |

All three must be set in both `.env` (local dev) and Netlify site settings → Environment Variables (production).

---

## Agent Instructions

If you are an AI agent reading this to pick up where we left off:

1. **Read this whole document first.** Don't skip to the code.
2. **Check "Where We Stopped"** — that's your immediate context.
3. **Ask questions if anything is unclear** before writing code. Amiel communicates via voice notes (stream-of-consciousness) — read through and pull out the intent.
4. **Do a logic pass** if you're about to touch auth, RLS policies, or the session builder — these are the most complex parts.
5. **Don't over-engineer.** This is an internal tool for 2 people. Simple > clever.
6. **Mobile first, always.** Every UI element should be designed for a phone screen first.
7. **Test the build** (`npm run build`) before declaring anything done.
8. **The `.env` file is not in git.** The values are documented in the Environment Variables table above.
9. **Do not upgrade Vite or Tailwind.** Node 20.13.1 is the runtime and newer versions break on it.
