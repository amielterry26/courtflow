# CourtFlow — Agent Handoff Document
**Last updated: 2026-07-13 | Current session: 6 | Commit: `77c2eed`**

> **For any agent reading this:** You are picking up an active, evolving project. Read this entire document before touching any code. You have explicit permission to ask clarifying questions or run a full logic pass before making changes. This is the single source of truth for context, decisions, architecture, and current state.

---

## 1. What Is CourtFlow?

CourtFlow is a **mobile-first internal basketball training web app** for two trainers — **Amiel Terry** and **Derek** at Mason & Terry Training. It is **not** a commercial product. It is a personal internal tool built to be used **courtside on an iPhone** during actual training sessions.

**The vibe:** Fast, clean, no fluff. Simple > clever. Every UI decision should start with "how does this feel on a phone?" The app needs to work in one hand while Amiel is watching an athlete drill.

### The People

| Person | Role | Notes |
|--------|------|-------|
| Amiel Terry | Lead trainer, product owner, primary user | Communicates via voice notes — stream of consciousness. Extract the intent. |
| Derek | Co-trainer, secondary user | `Derek.mason2013@gmail.com` |
| Parents | View-only via share link | No login — see their kid's profile and upcoming sessions |

---

## 2. Tech Stack

| Layer | Tool | Version |
|-------|------|---------|
| Frontend | React | 18 |
| Build tool | Vite | 5 |
| Styling | Tailwind CSS | v3 (dark mode via `class` strategy) |
| Routing | React Router | v6 |
| Database / Auth | Supabase | `@supabase/supabase-js` |
| Drag & drop | dnd-kit | `@dnd-kit/core`, `/sortable`, `/utilities` |
| Email notifications | Web3Forms | Client-side fetch, no SDK |
| Deployment | Netlify | Build: `npm run build`, publish: `dist/` |
| Node | 20.13.1 | Pinned in `netlify.toml` |

### ⚠️ CRITICAL VERSION CONSTRAINTS — DO NOT UPGRADE
- **Vite past v5** — Vite 6+ uses Rolldown which breaks on Node 20.13.1
- **Tailwind past v3** — Tailwind v4 requires `@tailwindcss/vite` which needs a newer Node

---

## 3. Supabase Project

- **Project name:** Mason & Terry Training
- **Reference ID:** `hmqeakjpstjgsdhmtobe`
- **Region:** West US (Oregon)
- **Dashboard:** `https://supabase.com/dashboard/project/hmqeakjpstjgsdhmtobe`
- **Anon key:** in `.env` as `VITE_SUPABASE_ANON_KEY` (safe to expose — client-side only)

### Database Tables

| Table | Purpose |
|-------|---------|
| `athletes` | All athlete profiles |
| `drills` | The drill library (112+ drills seeded) |
| `sessions` | Training sessions |
| `session_athletes` | Join — which athletes are in which session |
| `session_drills` | Drills in a session with order, notes, reps, makes, duration |
| `intake_submissions` | Parent intake form submissions (pending review) |
| `player_rules` | Per-athlete rules (ordered list, stored separate from athletes table) |

### Key Athletes Table Columns
```
athletes:
  id, first_name, last_name, age, grade, school, team, position,
  favorite_player, parent_name, parent_phone, parent_email,
  skill_level (beginner/intermediate/advanced),
  gender (Male/Female),
  goals, strengths, weaknesses, notes,
  sessions_purchased (int), sessions_used (int),
  share_token (uuid — used for parent link),
  status (active/inactive/pending),
  created_at
```

### Key Drills Table Columns
```
drills:
  id, title, category, difficulty (beginner/intermediate/advanced),
  description, instructions, reps_or_time, video_url, created_at

category CHECK constraint:
  'ball handling','shooting','finishing','footwork','defense',
  'strength & conditioning','IQ','warmup','recovery','live action'
```

### Drill Categories (display labels)
| DB value | Display |
|----------|---------|
| `warmup` | Warm-Up |
| `recovery` | Recovery |
| `strength & conditioning` | Strength & Conditioning |
| `defense` | Defense |
| `footwork` | Footwork |
| `finishing` | Finishing |
| `shooting` | Shooting |
| `ball handling` | Ball Handling |
| `live action` | Live Action |
| `IQ` | Basketball IQ |

### player_rules Table
```
player_rules:
  id, athlete_id (FK → athletes), rule (text), order_index (int), created_at
```
Rules are ordered and editable per athlete. Chase's rules were seeded via migration.

### RLS Policies
- **Authenticated users** (trainers): Full CRUD on all tables
- **Anon users**: INSERT on `intake_submissions`, SELECT on `athletes`, `sessions`, `session_athletes`, `session_drills`, `drills` (parent view uses this — share_token is the access control)
- **player_rules**: `player_rules` requires authenticated read/write; anon can read (for parent view if needed)

### Migrations (in order)
```
supabase/migrations/
  20260703000000_init.sql                    # Initial schema
  20260713000000_location_and_categories.sql # Location field, category constraint updates
  20260713000001_session_pack.sql            # sessions_purchased, sessions_used
  20260713000002_drill_videos_storage.sql    # Supabase storage bucket for drill videos
  20260714000000_player_rules.sql            # player_rules table + RLS
  20260714000001_add_drills_and_chase_rules.sql # 112+ drills seeded, Chase's rules, live action category
  20260714000002_gender.sql                  # gender column on athletes + intake_submissions
```

All migrations have been applied to the live Supabase project.

---

## 4. Auth Model

### Three Access Levels
1. **Trainers (Amiel + Derek):** Email/password Supabase auth. Full CRUD. Accounts created manually in Supabase Dashboard → Auth → Users.
2. **Parents (view-only):** No login. Get shareable link: `/athlete/:share_token`. See athlete profile + upcoming + past sessions.
3. **Public (intake form):** No login. Access `/intake/form` only.

### Auth Persistence
- `supabase.js` uses `persistSession: true`, `autoRefreshToken: true`, `storageKey: 'courtflow-auth'`
- Once logged in on a device, the trainer stays logged in. Login page redirects home if already authed.
- **JWT expiry should be set to `2592000` (30 days)** in Supabase → Auth → Settings — check if this has been done.

### Still Needs Manual Setup (Amiel)
- [ ] Create trainer accounts in Supabase → Auth → Users for Amiel and Derek
- [ ] Set JWT expiry to `2592000` in Supabase → Auth → Settings
- [ ] Disable "Enable Sign Ups" in Supabase → Auth → Settings
- [ ] Add `VITE_WEB3FORMS_KEY` to Netlify Environment Variables

---

## 5. Deployment

- **Live URL:** `https://rad-chaja-b7245c.netlify.app`
- **GitHub repo:** `https://github.com/amielterry26/courtflow`
- **CI/CD:** GitHub → Netlify auto-deploy is now live (push to `main` triggers deploy)
- **Build:** `npm run build` → output in `dist/`
- **SPA redirect:** `netlify.toml` handles `/* → /index.html`
- **Node version:** Pinned to `20` in `netlify.toml`

### Netlify Environment Variables Required
| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://hmqeakjpstjgsdhmtobe.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_WEB3FORMS_KEY` | `527c9017-ad35-4337-9000-9515c906e162` |

---

## 6. Full File Structure

```
courtflow/
├── public/
├── src/
│   ├── lib/
│   │   └── supabase.js              # Supabase client init
│   ├── context/
│   │   ├── AuthContext.jsx          # Auth state, onAuthStateChange listener
│   │   └── ThemeContext.jsx         # Light/dark, localStorage, OS listener, overscroll bg
│   ├── components/
│   │   ├── Layout.jsx               # App shell: top bar + floating pill nav
│   │   └── ProtectedRoute.jsx       # Redirects to /login if not authed
│   ├── pages/
│   │   ├── Login.jsx                # Email/password, auto-redirects if already authed
│   │   ├── Today.jsx                # Dashboard: stats row + today sessions + recent athletes
│   │   ├── Athletes.jsx             # List + search + Gender/Grade/Age filters + session count
│   │   ├── AthleteDetail.jsx        # Full profile, collapsible sections, sessions accordion
│   │   ├── AthleteForm.jsx          # Create/edit athlete (includes gender field)
│   │   ├── AthletePublicView.jsx    # Parent view at /athlete/:token
│   │   ├── Drills.jsx               # Library: no default selection, category filters (multi-select)
│   │   ├── DrillDetail.jsx          # Read-only drill view (shows filled fields only)
│   │   ├── DrillForm.jsx            # Create/edit drill (routes to /drills/:id/edit)
│   │   ├── Sessions.jsx             # Session list grouped by date + calendar export
│   │   ├── SessionDetail.jsx        # Session view + drag-to-reorder drill builder
│   │   ├── SessionForm.jsx          # Create/edit session + athlete multi-picker
│   │   ├── Intake.jsx               # Trainer intake review panel
│   │   ├── IntakeForm.jsx           # Public form (gender field required, Web3Forms email)
│   │   └── WeeklySchedule.jsx       # Week view calendar
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/
│   └── migrations/                  # All 7 migration files (all applied to prod)
├── AGENT_HANDOFF.md                 # This file
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── netlify.toml
├── .env                             # Not in git — see env vars table above
└── .env.example
```

---

## 7. Routes

### Public (no auth)
| Route | Component | Notes |
|-------|-----------|-------|
| `/login` | Login.jsx | Redirects home if already authed |
| `/intake/form` | IntakeForm.jsx | Parent intake, no auth |
| `/athlete/:token` | AthletePublicView.jsx | Parent-facing profile view |

### Protected (trainer-only, all behind ProtectedRoute)
| Route | Component |
|-------|-----------|
| `/` | Today.jsx |
| `/schedule` | WeeklySchedule.jsx |
| `/athletes` | Athletes.jsx |
| `/athletes/new` | AthleteForm.jsx |
| `/athletes/:id` | AthleteDetail.jsx |
| `/athletes/:id/edit` | AthleteForm.jsx |
| `/drills` | Drills.jsx |
| `/drills/new` | DrillForm.jsx |
| `/drills/:id` | **DrillDetail.jsx** (read-only) |
| `/drills/:id/edit` | DrillForm.jsx |
| `/sessions` | Sessions.jsx |
| `/sessions/new` | SessionForm.jsx |
| `/sessions/:id` | SessionDetail.jsx |
| `/sessions/:id/edit` | SessionForm.jsx |
| `/intake` | Intake.jsx |

---

## 8. Navigation

The bottom nav is a **floating pill/dock** (not full-width). It's fixed at `bottom-5`, centered, with a white/dark card and rounded-2xl. Active tab = blue background. Main content has `pb-28` to clear it.

**Nav order:** Today → Drills → Sessions → Athletes → Intake

---

## 9. Features Built — Complete Inventory (Session-by-Session)

### Session 1 — Initial Build (v1)
- Full app scaffold: React, Vite, Tailwind, Supabase, dnd-kit
- All core pages built: Today, Athletes, Drills, Sessions, Intake, AthleteDetail, AthleteForm, DrillForm, SessionDetail, SessionForm, IntakeForm
- Auth: Email/password login, ProtectedRoute, session persistence
- Parent share view (`/athlete/:token`)
- Light/dark mode with localStorage persistence
- Mobile viewport meta tags (no zoom, Apple PWA)
- `netlify.toml` SPA redirect

### Session 2 — Auth + Email Polish
- Login page auto-redirects home if already authenticated
- Web3Forms integration in IntakeForm for email notifications
- EmailJS evaluated and rejected (too complex — Web3Forms chosen instead)

### Session 3 — Parent View, Calendar, Session Pack, Videos
- Parent view overhauled: upcoming sessions with drill breakdown by category
- Google Calendar export (gcal link)
- Apple Calendar export (ICS file)
- Session pack tracker (sessions_purchased / sessions_used + progress bar on athlete profile)
- Video upload for drills (Supabase storage bucket `drill-videos`)
- Weekly schedule view (`/schedule`)
- Session duplicate button in SessionDetail

### Session 4 — Drill Filters, Player Rules, Nav, Drill Library
- Multi-select drill category filters (OR logic, wrapping layout)
- `live action` category added throughout (DrillForm, Drills, AthletePublicView)
- Nav reordered: Today → Drills → Sessions → Athletes → Intake
- **Player Rules** on every athlete profile — add, edit, delete, reorder (▲▼), stored in `player_rules` table
- Chase's 6 player rules seeded via migration
- 112+ drills added across all categories via migration
- Apple Calendar button hidden on non-iOS (shows only on iPhone)
- Parent view: Development section (goals, strengths, weaknesses, notes) + Session History

### Session 5 — Polish Pass
- **Drill library:** No category auto-selected on load; empty state prompts trainer to pick category
- **Drill read-only view:** `/drills/:id` → DrillDetail.jsx (shows only filled fields); Edit button at top right
- **Athlete header:** Parent name (tap-to-call), phone, email always visible in profile card
- **Athlete filters:** Gender / Grade / Age dropdowns; Clear filters button; session count via join
- **Gender field:** Added to AthleteForm and IntakeForm (required on intake); migration seeds Victoria + Isabel = Female, everyone else = Male
- **Home dashboard:** 2-stat row (active athletes, sessions this week) + recent athletes section
- **Floating pill nav:** Replaced full-width bar
- **Collapsible sections** in AthleteDetail: Info, Development, Player Rules, Session History (history collapsed by default)

### Session 6 — Athlete Header, Sessions Accordion, Calendar Fix, Theme
- **Athlete header redesign:** Name on top line, Grade/Age/Gender/session count on second line, position/school on third. Skill badge. Parent contact box (name, phone, email tappable). Share link button.
- **Sessions section restructured:** Today (blue label, always visible) → Upcoming (always visible) → Past(N) collapsed accordion
- **Apple Calendar fixed:** Replaced broken `data:text/calendar` approach with `navigator.share()` + ICS file. Opens iOS share sheet → "Add to Calendar". Falls back to blob URL on desktop.
- **Theme:** Added `MediaQueryList` listener — if no localStorage override, app follows OS theme changes in real time
- **Overscroll background:** `document.documentElement.style.backgroundColor` + `document.body.style.backgroundColor` set on every theme change (`#09090b` dark / `#fafafa` light) — fixes iOS rubber-band white flash

---

## 10. ThemeContext Behavior (Important Detail)

```js
// ThemeContext.jsx logic:
// 1. Initial state: reads localStorage → if none, reads prefers-color-scheme
// 2. Listens for OS theme changes via MediaQueryList — auto-follows system IF
//    no localStorage override exists
// 3. On every theme change: sets .dark class on <html>, writes to localStorage,
//    sets document.documentElement.style.backgroundColor for overscroll fix
// 4. Toggle button (in Layout.jsx header) manually overrides — writes to localStorage
```

---

## 11. Apple Calendar Implementation (Current — Session 6)

All three calendar files (`Sessions.jsx`, `SessionDetail.jsx`, `AthletePublicView.jsx`) now use:

```js
async function openAppleCalendar(session) {
  const ics = buildICSContent(session)
  const file = new File([ics], 'courtflow.ics', { type: 'text/calendar' })

  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }) } catch { /* user cancelled */ }
    return
  }
  // Desktop fallback
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
```

The old `window.location.href = 'data:text/calendar...'` approach was removed — it was blocked by iOS Safari in recent versions. The `navigator.share()` + File approach opens the native iOS share sheet, where users tap "Add to Calendar."

---

## 12. AthleteDetail Page Structure

```
← Back

[Header Card]
  Avatar | Name
         | Grade X · Yy · Gender · Z sessions
         | Position · School
  [Skill badge]
  [Parent Contact Box]
    Parent: Parent Name
    Phone:  555-xxx-xxxx  ← tap-to-call
    Email:  email@x.com   ← tap-to-email
  [🔗 Copy parent share link]

[Info ▼ collapsible]       ← open by default
  Age | Grade | Gender | Team | Fav player

[Session Pack]             ← only if sessions_purchased > 0
  Progress bar

[Development ▼ collapsible] ← open by default
  Goals | Strengths | Weaknesses | Notes

[Player Rules ▼ collapsible] ← open by default
  Numbered list, ▲▼ reorder, Edit/✕ on hover, Add input

[Sessions card]
  TODAY (blue)
    session rows
  UPCOMING
    session rows
  PAST (N) ▼  ← collapsed by default
    session rows (dim)
```

---

## 13. Known Issues & Backlog

| # | Issue | Priority | Notes |
|---|-------|----------|-------|
| 1 | No loading skeletons | Low | Shows "Loading..." text throughout |
| 2 | Bundle size ~592KB | Low | Acceptable for internal tool |
| 3 | No error boundaries | Low | Silent failures if Supabase is down |
| 4 | No push notifications to parents | Future | "Session scheduled for Friday" |
| 5 | No PWA/offline support | Future | Courtside connectivity can be spotty |
| 6 | No custom domain | Backlog | Still on `rad-chaja-b7245c.netlify.app` |
| 7 | Intake → Athlete: gender/grade not auto-populated | Low | When approving an intake, the new athlete form could pre-fill from intake submission |
| 8 | Drill library has no read-only view from session context | Low | From SessionDetail, drills aren't linked to DrillDetail |
| 9 | AthletePublicView player rules not shown | Low | Parent view doesn't show player rules — may be intentional |
| 10 | No per-athlete session customization | Future | All athletes in a session share the same drill list |

---

## 14. Key Architecture Decisions

| Decision | Reason |
|----------|--------|
| No Google OAuth | Only 2 users — email/password is simpler and sufficient |
| Parent share links, not accounts | Zero friction — works like a Google Doc share link |
| Vite 5, Tailwind 3 | Node 20.13.1 constraint — newer versions break the build |
| Web3Forms over EmailJS | EmailJS too many setup steps. Web3Forms = one key, one fetch call |
| Email is best-effort | DB save is source of truth. Intake is in Supabase even if email fails |
| dnd-kit for drag-and-drop | Well-maintained, touch-first, works great on mobile |
| player_rules as separate table | Avoids jsonb complexity, cleaner to reorder and edit |
| gender as separate column | Clean filtering, simple constraints, migration-seeded for existing athletes |
| `navigator.share()` for ICS | `data:` URIs blocked in iOS Safari 17+; share sheet is the correct approach |
| Floating pill nav | Cleaner than full-width bar — doesn't dominate the screen on mobile |
| No CI/CD initially → now connected | GitHub → Netlify auto-deploy is live. Push to main = deploy. |

---

## 15. Future Features (Backlog, Not Started)

These were discussed but intentionally left out of v1. All are valid ideas for future sessions:

- **Session templates** — Save a session as a reusable template
- **Progress tracking** — Log what actually happened during a session (makes vs target, notes per drill)
- **Per-athlete session customization** — Right now all athletes share the same drill list per session. Future: per-athlete branches
- **Parent push notifications** — "Session scheduled for Friday 4pm" via web push or email
- **Parent accounts** — If share links aren't sufficient, real Supabase auth for parents
- **Video drill demos** — `drills.video_url` field exists and upload UI is in DrillForm. Just needs the DrillDetail view to be surfaced more prominently in session context
- **PWA / offline mode** — Service worker for basic offline viewing courtside
- **Custom domain** — Replace `rad-chaja-b7245c.netlify.app`
- **Attendance tracking** — Mark athletes present/absent per session
- **Session notes on parent view** — Right now session notes aren't shown to parents
- **Bulk athlete import** — CSV or form-based bulk add
- **Athlete archive / inactive list** — Currently only active athletes shown; no way to view inactive from the app

---

## 16. Agent Instructions

**Read this before writing a single line of code.**

1. **Ask questions if anything is ambiguous.** Amiel communicates via voice notes — read through the intent, don't ask about every word, but do ask if something is architecturally unclear before building in the wrong direction.

2. **Do a logic pass first** if touching: auth flow, RLS policies, `player_rules` reordering, or the session builder drag-and-drop. These are the most entangled parts.

3. **Mobile first, always.** Design for iPhone. If it's awkward to tap one-handed on a 6" screen, fix it.

4. **Simple > clever.** This is a tool for 2 people. Don't abstract, don't over-engineer, don't add features beyond what's asked.

5. **Test the build:** `npm run build` must pass clean before pushing. The only warning allowed is the bundle size warning.

6. **The `.env` file is not in git.** Values are in the Environment Variables table above.

7. **Do not upgrade Vite or Tailwind.** Node 20.13.1 is the runtime.

8. **Push to `main` = auto-deploys to Netlify.** Confirm the build passes locally first.

9. **All migrations go in `supabase/migrations/`.** Use `npx supabase db push --linked` to apply them. Use timestamp format `YYYYMMDDHHMMSS_description.sql`.

10. **Current commit:** `77c2eed` (Session 6). The app is fully functional and deployed.
