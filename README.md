# Sentinel Gateway

> **See your traffic think.**
> A self-aware, production-grade API Gateway that detects, decides, acts, and explains — in under 300 ms.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-sentinalgateway.vercel.app-0047AB?style=flat-square&logo=vercel)](https://sentinalgateway.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js%2016-App%20Router-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Neon](https://img.shields.io/badge/Database-Neon%20Postgres-00E5CC?style=flat-square)](https://neon.tech)
[![Better Auth](https://img.shields.io/badge/Auth-Better%20Auth-5B21B6?style=flat-square)](https://better-auth.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle-C5F74F?style=flat-square)](https://orm.drizzle.team)

---

## What is Sentinel Gateway?

Sentinel Gateway is an intelligent API control plane that wraps your microservices in a closed-loop intelligence layer. Instead of passively forwarding traffic, it continuously monitors every service, detects emerging anomalies before they cascade, shapes load in real time, and produces a full, reversible audit trail of every autonomous decision it makes.

The result: **incidents are contained in milliseconds, not minutes — and your on-call engineer reads a post-incident report, not a pager alert.**

---

## The Four-Capability Loop

```
SENSE ──► DECIDE ──► ACT ──► EXPLAIN
  ▲                              │
  └──────────────────────────────┘
         closed-loop feedback
```

| Phase | What happens | Latency |
|---|---|---|
| **Sense** | Bayesian anomaly detection on p99, error rate, and RPS deltas | < 40 ms |
| **Decide** | Policy engine weighs circuit-breaker vs. adaptive shedding vs. backpressure | < 200 ms |
| **Act** | Circuit opens, traffic sheds, or retry buffers engage — zero human input | < 300 ms |
| **Explain** | Full weighted-reasoning trace logged; operator can approve or one-click rollback | instant |

---

## Live Stats (real-time on the dashboard)

| Metric | Typical value | What it means |
|---|---|---|
| Requests / sec | ~131k | Total inbound RPS across all services |
| Global p99 | ~97 ms | 99th-percentile end-to-end latency |
| Error rate | ~1.66% | End-user visible errors (circuit-open traffic excluded) |
| Decision confidence | 96% | SentinelBrain-v3 model certainty on last autonomous action |
| Requests protected | 312k+ | Requests shielded from cascading failures since last incident |

---

## Application Screens

| Route | Name | Description |
|---|---|---|
| `/` | **Overview** | Cinematic 3D landing page — glass prism + particle stream hero, live stat bar, feature grid, and the closed-loop explainer. |
| `/command-center` | **Command Center** | Real-time KPI cards with sparklines, interactive service topology map, node inspector with Apply Mitigation / Snooze / Reset, and a live anomaly feed. |
| `/flow-canvas` | **Flow Canvas** | Visual traffic-shaping policy editor. Tune capacity budgets per service, create new policies, and deploy changes — all persisted to Neon Postgres. |
| `/decisions` | **Decision Explainer** | Glass-box AI decision inspector. Weighted reasoning trace, live model confidence, and one-click Approve or Roll Back with a full audit log export. |

---

## Production-Grade Backend

This is not a demo with localStorage. Every operator action is durable.

### Database — Neon Postgres (9 tables)

| Table | Purpose |
|---|---|
| `user`, `session`, `account`, `verification` | Better Auth — operator identity and sessions |
| `service_nodes` | Persistent health and circuit state for each gateway node |
| `shaping_policies` | Durable traffic-shaping policy definitions |
| `decisions` | AI-generated gateway decisions with outcomes |
| `decision_steps` | Per-step reasoning trace for the explainer UI |
| `audit_log` | Tamper-evident log of every sentinel and operator action |

All 9 tables were provisioned directly via the Neon MCP. The schema is defined in `lib/db/schema.ts` using Drizzle ORM with snake_case column mappings that match the Neon database exactly.

### Authentication — Better Auth

- Email + password authentication for operators
- Session cookies with `sameSite: none` + `secure: true` for cross-origin iframe compatibility (v0 preview)
- Full `trustedOrigins` cascade: local dev → Vercel preview → Vercel production
- All inner routes (`/command-center`, `/flow-canvas`, `/decisions`) redirect unauthenticated visitors to `/sign-in`
- `BETTER_AUTH_SECRET` environment variable required (generate with `openssl rand -base64 32`)

### Server Actions (Zod-validated, session-scoped)

```
app/actions/
  policies.ts    — getPolicies, createPolicy, updatePolicy, deletePolicy
  decisions.ts   — getDecisions, applyDecisionAction (approve / rollback)
  nodes.ts       — applyNodeAction (mitigate / snooze / reset)
  audit.ts       — getAuditLog (JSON or CSV export)
```

Every action calls `getUserId()` which validates the Better Auth session before touching the database. There is no RLS on Neon — every query is explicitly scoped by `userId`.

### API Routes (all Neon-backed)

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/[...all]` | GET, POST | Better Auth catch-all handler |
| `/api/telemetry/stream` | GET SSE | Server-side tick loop merging DB node health into the live stream |
| `/api/telemetry/snapshot` | GET | Single frozen snapshot for SSR hydration |
| `/api/nodes` | GET | Current node list from Neon |
| `/api/nodes/[id]/action` | POST | Persist operator mitigation action to DB |
| `/api/policies` | GET, POST | List and create shaping policies |
| `/api/policies/[id]` | PATCH, DELETE | Update or remove a policy |
| `/api/decisions` | GET | Decision list with full step traces joined from `decision_steps` |
| `/api/decisions/[id]/action` | POST | Approve or roll back a decision |
| `/api/audit` | GET | Full audit log — JSON or `Accept: text/csv` for file download |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js — App Router, RSC, Server Actions | 16.2.6 |
| Language | TypeScript (strict) | 5.7.3 |
| Database | Neon Postgres via Drizzle ORM | drizzle-orm 0.45 |
| Auth | Better Auth (email + password, shared pg Pool) | 1.6.23 |
| Validation | Zod | 4.4 |
| Styling | Tailwind CSS v4 + custom design tokens | 4.2 |
| 3D | React Three Fiber + Drei | r3f 9.6 / drei 10.7 |
| Real-time | SSE stream + `useSyncExternalStore` client engine | — |
| Icons | lucide-react | 1.16 |
| Analytics | Vercel Analytics | 1.6 |

---

## System Architecture

```mermaid
graph TD
    subgraph Client["Browser"]
        Hook["hooks/use-live.ts<br/>useSyncExternalStore + SSE merge"]
        UI["Live UI Components<br/>KPI cards, sparklines, topology map"]
    end

    subgraph Server["Next.js Server (RSC + Actions)"]
        Actions["app/actions/*<br/>Zod-validated, session-scoped"]
        SSE["app/api/telemetry/stream<br/>server-side DB tick loop"]
        APIRoutes["app/api/*<br/>REST endpoints"]
        AuthLayer["lib/auth.ts<br/>Better Auth session guard"]
    end

    subgraph DB["Neon Postgres"]
        AuthTables["user / session / account / verification"]
        AppTables["service_nodes / shaping_policies<br/>decisions / decision_steps / audit_log"]
    end

    Hook --> UI
    UI --> APIRoutes
    SSE --> DB
    Hook --> SSE
    APIRoutes --> Actions --> DB
    AuthLayer --> Actions
```

---

## Real-Time Data Flow

```mermaid
sequenceDiagram
    participant Sim as Sim Engine (1.5 s tick)
    participant Hook as useLiveWithDb()
    participant SSE as /api/telemetry/stream
    participant DB as Neon Postgres
    participant UI as Browser Components

    Note over Sim: tick-0 frozen snapshot → SSR hydration
    Sim->>Hook: tick fires (client)
    Hook->>SSE: EventSource connection
    SSE->>DB: SELECT node health + circuit state
    DB-->>SSE: durable overrides (health, circuit, p99, error_rate)
    SSE-->>Hook: SSE event — merged JSON snapshot
    Hook->>Hook: overlay DB state over sim data
    Hook->>UI: re-render sparklines, feeds, topology map
```

`useLiveWithDb()` subscribes to the authenticated server-sent event stream and derives KPIs, topology edges, anomaly signals, and sparklines from each database snapshot. The browser never connects directly to the database.

---

## Key Architecture Decisions

**Why an SSE-backed client store?**
The database stores the authoritative service state. The client store receives authenticated snapshots over SSE and derives visual telemetry without making browser-side database calls.

**Why no RLS on Neon?**
Better Auth uses a shared `pg` Pool for session management. Protected routes and actions require a valid session, and operator-owned shaping policies are explicitly filtered by their `created_by` user ID. Gateway node and decision data are shared control-plane state.

**Why `'use client'` is never imported from server routes**
The SSE route and node-action API are fully server-side. They do not import browser globals or client-only modules.

---

## File Structure

```
sentinel-gateway/
├── app/
│   ├── layout.tsx                  # Root layout: fonts, AmbientScene backdrop
│   ├── globals.css                 # Tailwind v4 design tokens
│   ├── page.tsx                    # Overview landing page (session-aware nav)
│   ├── sign-in/page.tsx            # Operator sign-in (redirects if authed)
│   ├── sign-up/page.tsx            # Operator sign-up (redirects if authed)
│   ├── actions/
│   │   ├── policies.ts             # Policy CRUD — getPolicies, createPolicy, updatePolicy, deletePolicy
│   │   ├── decisions.ts            # Decision approve/rollback — getDecisions, applyDecisionAction
│   │   ├── nodes.ts                # Node mitigation — applyNodeAction
│   │   └── audit.ts                # Audit log read
│   ├── api/
│   │   ├── auth/[...all]/          # Better Auth catch-all
│   │   ├── telemetry/stream/       # SSE: pure server-side DB tick loop
│   │   ├── telemetry/snapshot/     # Frozen snapshot for SSR hydration
│   │   ├── nodes/                  # REST: node list + action
│   │   ├── policies/               # REST: policy CRUD
│   │   ├── decisions/              # REST: decision list + action
│   │   └── audit/                  # REST: audit log + CSV export
│   ├── command-center/page.tsx     # Nervous System Map (session-guarded)
│   ├── flow-canvas/page.tsx        # Traffic shaping canvas (session-guarded)
│   └── decisions/page.tsx          # Decision explainer (session-guarded)
│
├── components/
│   ├── site-nav.tsx                # Glass navbar — user chip + sign-out
│   ├── auth-form.tsx               # Shared sign-in / sign-up form
│   ├── sign-out-button.tsx         # Client-side sign-out via authClient
│   ├── live-metrics-bar.tsx        # Live RPS / p99 / error bar (inner routes)
│   ├── nervous-system-map.tsx      # Interactive topology map
│   ├── three/
│   │   ├── hero-scene.tsx          # 3D glass prism + particles + orbital rings
│   │   └── ambient-scene.tsx       # 3D ambient backdrop (inner routes)
│   ├── landing/
│   │   ├── hero-section.tsx        # Headline, CTAs, live stat bar
│   │   ├── feature-grid.tsx        # Feature cards with live micro-stats
│   │   ├── closed-loop.tsx         # Sense / Decide / Act / Explain
│   │   └── cta-footer.tsx          # Closing CTA
│   ├── command/
│   │   ├── kpi-cards.tsx           # Live KPI tiles with sparklines
│   │   ├── anomaly-feed.tsx        # Streaming anomaly feed
│   │   ├── command-console.tsx     # Topology map + node inspector (useLiveWithDb)
│   │   └── freeze-button.tsx       # Pause/resume the sim engine
│   ├── flow/
│   │   ├── flow-board.tsx          # Policy editor (DB-backed, useLiveWithDb)
│   │   └── new-policy-modal.tsx    # Create policy modal (server action only)
│   └── decisions/
│       ├── decision-summary.tsx    # Live confidence + Approve / Roll Back
│       ├── decision-trace.tsx      # Weighted reasoning steps (from DB)
│       └── export-audit-button.tsx # Download audit log as CSV
│
├── hooks/
│   └── use-live.ts                 # useSyncExternalStore + authenticated SSE telemetry
│
├── lib/
│   ├── auth.ts                     # Better Auth config (trustedOrigins + dev cookie fix)
│   ├── auth-client.ts              # Better Auth React client
│   ├── db/
│   │   ├── index.ts                # Drizzle client + shared pg Pool
│   │   └── schema.ts               # Better Auth tables + 5 app tables
│   └── utils.ts                    # cn() helper
│
├── proxy.ts                        # Session-based route protection
└── drizzle.config.ts               # Drizzle config (Neon connection)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- A [Neon](https://neon.tech) Postgres database
- A `BETTER_AUTH_SECRET` — generate one with:
  ```bash
  openssl rand -base64 32
  ```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
BETTER_AUTH_SECRET=<32+ character random string>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

Use `.env.local` for local values. It is ignored by Git, together with `.env`, so secrets are not committed.

### Database Setup

`lib/db/schema.ts` is the source of truth for the four Better Auth tables and five application tables. Provision a new database through your approved migration workflow, preserving the table and column names in that file.

Verify an existing database before running the app:

```bash
pnpm exec node scripts/check-neon-schema.mjs
```

The verification script loads `.env.local` when present and performs read-only information-schema queries. It must list `user`, `session`, `account`, `verification`, `service_nodes`, `shaping_policies`, `decisions`, `decision_steps`, and `audit_log`.

### Install and Run

```bash
# Install dependencies
pnpm install

# Run the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), sign up for an operator account at `/sign-up`, and you are in.

### Production Build

```bash
pnpm build
pnpm start
```

### Verification

```bash
pnpm typecheck
pnpm build
pnpm audit --prod
pnpm exec node scripts/check-neon-schema.mjs
```

`GET /api/auth/get-session` returns `200` with `null` when no operator is signed in. Inner API routes and telemetry require an authenticated session. Policy reads and writes are scoped to the policy creator, malformed node and decision actions are rejected, and a decision cannot be actioned twice.

### Deploying to Vercel

1. Push to `main` — Vercel auto-deploys on every push.
2. Add the following environment variables in the Vercel project settings:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string (pooled) |
| `BETTER_AUTH_SECRET` | Output of `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Your production URL e.g. `https://sentinalgateway.vercel.app` |

`BETTER_AUTH_URL` is optional when deployed to Vercel — the auth config automatically falls back to `VERCEL_PROJECT_PRODUCTION_URL`. Set it only if you use a custom domain.

---

## Design System

| Token | Role | Value |
|---|---|---|
| `--background` | Pearl-white surface | `#eef3fb` |
| `--foreground` | Deep-indigo text | `#1a237e` family |
| `--primary` | Primary actions / brand | `#1a237e` |
| `--cyan` | Bioluminescent live indicators | `#22c3e6` |
| `--coral` | Stress / circuit-open signals | `#f87171` |
| `--amber` | Warning-level signals | `#f59e0b` |
| `--border` | Subtle glass dividers | `rgba(255,255,255,0.18)` |

- **Typography** — Geist Sans for all UI copy; Geist Mono for numeric metrics and code.
- **Surfaces** — glassmorphism throughout: translucent panels, `backdrop-blur-md`, soft borders.
- **Motion** — `sentinel-pulse` keyframe on all live indicators; continuous drift on the 3D ambient scene.
- **3D** — Glass prism rendered with `MeshTransmissionMaterial`, a 900-particle stream, and orbital rings.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit using conventional commit messages: `feat:`, `fix:`, `chore:`, `docs:`
4. Open a pull request against `main`

All PRs must pass `pnpm exec tsc --noEmit` with zero type errors before merging.

---

<p align="center">
  <strong>Sentinel Gateway</strong> — <em>See your traffic think.</em>
</p>
