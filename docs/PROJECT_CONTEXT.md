# SafeLine — Project Context & Implementation Summary

This document records what was built, in what order, and why — for the Himshikhar Capstone **SafeLine** frontend.

---

## What SafeLine is

**SafeLine** is a trust & safety platform with three AI-powered checkers:

| Checker | Route | Purpose |
|---------|-------|---------|
| Scam Message | `/scam` | Phishing SMS, fake bank alerts, suspicious links |
| Fake Job Offer | `/jobs` | Upfront-fee offers, impersonated recruiting |
| Crisis Rumor | `/crisis` | Forwarded emergency claims vs official bulletins |

Plus a **WhatsApp bot companion** (UI mockup on landing; backend not built yet).

Design intent: calm, cited, fact-checking newsroom feel — not a flashy AI SaaS landing page.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + custom design tokens |
| UI primitives | shadcn-style components (Radix + CVA) |
| Routing | React Router v7 |
| Icons | Lucide (line icons only) |
| Auth & database | **Supabase** (Auth + Postgres + RLS) |
| Agent checks | Mock data via `checkContent()` — real backend TBD |

---

## Design system (as specified)

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `paper` | `#EDF0EE` | Page background |
| `ink` | `#1B2A41` | Primary text, nav, buttons |
| `verified` | `#1E6F5C` | Safe / confirmed |
| `risk` | `#B23A2E` | High-risk / false |
| `pending` | `#B8862B` | Unverified / medium |
| `line` | `#D8D5CC` | Hairline borders and dividers |

Secondary text uses `ink` at low opacity (`text-ink/60`), not a separate grey palette.

### Typography

- **Fraunces** — display headings only (hero, section titles)
- **IBM Plex Sans** — body, labels, buttons
- **IBM Plex Mono** — citations, source tags, confidence, timestamps

### Layout rules

- Border radius: 10–12px
- Hairline `border-line` dividers; no drop-shadow cards
- Numbered steps **only** in the “How it works” section
- Responsive down to 375px; visible keyboard focus states

---

## Signature component: `AnnotatedVerdictCard`

Every check result is rendered through this component. It shows:

1. Submitted text with colored underlines on flagged phrases (risk / verified / pending) and superscript tags (¹ ² ³)
2. Rotated circular verdict stamp (e.g. HIGH RISK, VERIFIED SAFE)
3. Numbered “Sources checked” evidence list with checkmark/X per source
4. Confidence bar (0–100%) and risk score badge
5. Recommended action strip
6. Domain-specific disclaimer

Animations on load: underlines draw left-to-right, stamp rotates in, evidence rows fade in staggered. Respects `prefers-reduced-motion`.

---

## Implementation timeline

### Phase 1 — Greenfield frontend (complete)

Started from an **empty** `Frontend/` directory.

**Scaffolded:**

- Vite + React + TypeScript
- Tailwind v4 with custom `@theme` tokens in `src/index.css`
- React Router for all routes
- Minimal shadcn-style UI: Button, Input, Textarea, Label, Select, Badge

**Built:**

- `src/types/agent.ts` — `AgentVerdict`, `AnnotatedVerdict`, `EvidenceItem`, etc.
- `src/data/mockVerdicts.ts` — realistic mock examples per agent (HDFC KYC scam SMS, fake Amazon job, Mullaperiyar flood forward)
- `src/lib/checkContent.ts` — single swap point for future backend; ~1.5s mock delay
- `AnnotatedVerdictCard`, `CheckingSourcesLoader`, layout (Nav, Footer, AppLayout)
- Landing page: hero demo, how-it-works, checker cards, trust section, WhatsApp mockup
- Three tool pages with agent-specific inputs
- `/about` responsible-use page
- Stub auth/dashboard pages (no live backend yet)

**Deferred initially:** Supabase auth and check history.

---

### Stub migration — Firebase → Supabase (complete)

User chose **Supabase only** (not Firebase). A quick pass replaced Firebase placeholders:

| Removed | Added |
|---------|-------|
| `src/lib/firebase.ts` | `src/lib/supabase.ts` (commented stub) |
| `firestore.rules` | `supabase/migrations/001_checks.sql` |
| `VITE_FIREBASE_*` in `.env.example` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Firebase copy on auth pages | “Once Supabase is connected” messaging |
| — | `src/lib/checks.ts` (no-op stubs) |
| — | `src/contexts/AuthContext.tsx` (placeholder `user: null`) |

No live wiring at this stage — UI and mock checks unchanged.

---

### Phase 2 — Supabase live wiring (complete)

Connected to the **Safe Line** Supabase project:

| Property | Value |
|----------|-------|
| Project name | Safe Line |
| Project ref | `fnkxabyvnqkykpnzhxrk` |
| URL | `https://fnkxabyvnqkykpnzhxrk.supabase.co` |

#### Dependencies & config

- Installed `@supabase/supabase-js`
- Activated `src/lib/supabase.ts` with env-based `createClient`
- Created local `.env` (gitignored) with project URL + anon key
- Updated `.gitignore` for `.env` / `.env.local`

#### Database (applied via Supabase MCP)

**`checks` table** — stores user check history:

```sql
id, user_id, agent, input_text, verdict (jsonb), created_at
```

RLS: users can SELECT and INSERT only their own rows.

**`profiles` table** — dashboard WhatsApp link:

```sql
id, whatsapp_phone, updated_at
```

RLS: users manage own profile. Trigger `on_auth_user_created` auto-creates a profile row on signup.

Migration files in repo:

- `supabase/migrations/001_checks.sql`
- `supabase/migrations/002_profiles.sql`

#### Auth (`src/contexts/AuthContext.tsx`)

- Session listener via `onAuthStateChange`
- `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `signOut`
- Wired into `SignInPage` and `SignUpPage` with error handling and redirects

#### Route protection & nav

- `ProtectedRoute` — guests redirected to `/sign-in`
- `/dashboard` wrapped in `ProtectedRoute`
- Nav shows Dashboard + Sign out when signed in

#### Check history

- `src/lib/checks.ts` — `saveCheck`, `getUserChecks`, `getProfile`, `updateWhatsAppPhone`
- `useContentCheck` — after mock verdict, saves to Supabase if user is signed in
- `RecentChecksStrip` — loads last 5 checks for signed-in users
- `DashboardPage` — real history table, profile email, WhatsApp phone save

#### Types

- `src/types/database.ts` — generated from Supabase schema

**Still mock:** `checkContent()` returns local mock data. Swap in `fetch('https://<backend>/agents/{agent}', ...)` when the agent API exists.

---

## Route map

| Route | Page | Auth |
|-------|------|------|
| `/` | Landing | Public |
| `/scam` | Scam checker | Public |
| `/jobs` | Job offer checker | Public |
| `/crisis` | Crisis rumor checker | Public |
| `/about` | Responsible use | Public |
| `/sign-in` | Sign in | Public (redirects if signed in) |
| `/sign-up` | Sign up | Public (redirects if signed in) |
| `/dashboard` | History + profile | **Protected** |

---

## Key files

```
Frontend/
├── .env                          # Local Supabase keys (gitignored)
├── .env.example                  # Template for env vars
├── supabase/migrations/
│   ├── 001_checks.sql
│   └── 002_profiles.sql
└── src/
    ├── types/
    │   ├── agent.ts              # Verdict data contract
    │   └── database.ts           # Supabase generated types
    ├── data/mockVerdicts.ts      # Realistic mock examples
    ├── lib/
    │   ├── supabase.ts           # Supabase client
    │   ├── checks.ts             # History CRUD
    │   └── checkContent.ts       # Agent check API (mock)
    ├── contexts/AuthContext.tsx  # Auth state + methods
    ├── hooks/useContentCheck.ts  # Tool page check flow
    ├── components/
    │   ├── AnnotatedVerdictCard.tsx
    │   ├── ProtectedRoute.tsx
    │   ├── RecentChecksStrip.tsx
    │   └── layout/               # Nav, Footer, AppLayout
    └── pages/                    # All route pages
```

---

## Data contract

```typescript
interface AgentVerdict {
  agent: "scam" | "job_offer" | "crisis_rumor";
  status: "high_risk" | "medium_risk" | ... ;
  confidence: number;       // 0–1
  risk_score: number;       // 0–100
  red_flags: string[];
  evidence: EvidenceItem[];
  explanation: string;
  recommended_action: string;
  needs_human_review: boolean;
  disclaimer: string;
}
```

`AnnotatedVerdict` extends this with `input_text` and `flagged_spans` for UI rendering. Only the `AgentVerdict` portion is stored in the `verdict` jsonb column.

---

## How to run

```bash
# From repo root: copy .env.example → .env and fill keys once
cd Frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

### Supabase dashboard setup (one-time)

1. **Authentication → Providers** — enable Email and Google
2. **Authentication → URL Configuration** — add `http://localhost:5173` (and production URL when deployed)
3. Copy keys into the **repo root** [`.env`](../.env) (see [`.env.example`](../.env.example)):

```
VITE_SUPABASE_URL=https://fnkxabyvnqkykpnzhxrk.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_BASE_URL=http://localhost:8000
SUPABASE_SERVICE_ROLE_KEY=<backend-only — never VITE_*>
```

---

## What is not built yet

| Item | Notes |
|------|-------|
| Real agent backend | `checkContent` still returns mock data after 1.5s delay |
| WhatsApp bot service | Landing page has UI mockup only |
| Email confirmation UX | Sign-up handles “check your email” message; depends on Supabase auth settings |
| Production deploy | Vercel/Netlify + production redirect URL in Supabase |

---

## Copy voice (product principle)

Plain, calm, specific. No fear tactics or dark patterns. Buttons say exactly what they do (“Check this message”, not “Analyze now”). Real source names cited precisely (Google Safe Browsing, VirusTotal, etc.). Disclaimers on every verdict card.

---

*Last updated: July 2026 — reflects Phase 1, Supabase stub migration, and Phase 2 live wiring.*
