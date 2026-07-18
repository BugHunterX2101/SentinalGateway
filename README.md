<div align="center">

# Sentinel Gateway

### Give your APIs a nervous system.

**The intelligent, self-aware API gateway that senses anomalies in milliseconds, decides on the smallest-footprint intervention, acts without human delay, and explains every move with a full audit trail — all in a single unified control plane.**

---

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=flat-square&logoColor=black)](https://orm.drizzle.team)
[![Better Auth](https://img.shields.io/badge/Better_Auth-1.6-blueviolet?style=flat-square)](https://better-auth.com)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech)
[![Three.js](https://img.shields.io/badge/Three.js-0.185-black?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FBugHunterX2101%2FSentinalGateway)

</div>

---

## What Is Sentinel Gateway?

Sentinel Gateway is not a proxy with dashboards bolted on. It is an **autonomous, observable API gateway** built around a four-phase closed loop:

```
SENSE  →  DECIDE  →  ACT  →  EXPLAIN
```

Every request that flows through your service mesh is measured. Every anomaly triggers a graph-aware reasoning engine that estimates blast radius, selects the minimum-footprint intervention, deploys it instantly, and writes a step-by-step audit trace — all before your on-call engineer's phone even buzzes.

The control plane is a live, real-time web application backed by **Neon PostgreSQL** and streaming via **Server-Sent Events** at 1.5-second ticks. Engineers get a glass-box view of every automated decision: what signals triggered it, how confident the model was, and a one-click rollback if they disagree.

---

## At a Glance

| Traditional API Gateway | Sentinel Gateway |
|-------------------------|-----------------|
| Static rate limits | Learned seasonal baselines per service |
| Manual circuit breakers | Graph-aware auto-isolation with self-healing |
| Config file changes require restarts | Live policy deploy — zero restart, zero downtime |
| Decisions are a black box | Full step-by-step reasoning trace with confidence scores |
| Ops team paged at 3 AM | Incidents contained before the alert even fires |
| Single audit CSV export | Dual-format audit log (JSON + CSV) with typed entries |

---

## Live Demo

**[sentinalgateway.vercel.app](https://sentinalgateway.vercel.app)** — Create a free operator account and explore the live control plane. The demo runs against a real Neon database; telemetry ticks every 1.5 seconds.

---

## Architecture

### 1. High-Level System Overview

The application is structured in five layers: the browser client, the Next.js application server, an Edge middleware layer, the server-action and API layer, and Neon PostgreSQL.

```mermaid
graph TB
    subgraph Client["Browser Client"]
        Browser["Next.js React App<br/>(RSC + Client Components)"]
        SSEHook["use-live.ts<br/>SSE Singleton"]
    end

    subgraph Edge["Edge Middleware — proxy.ts"]
        RateLimit["Auth Rate Limiter<br/>10 req / 60s / IP"]
        AuthGuard["Session Guard<br/>Protected Route Redirect"]
    end

    subgraph App["Next.js 16 — App Router"]
        direction TB
        Landing["/  Landing Page<br/>(SSR, public)"]
        CC["/command-center<br/>(SSR, protected)"]
        FC["/flow-canvas<br/>(SSR, protected)"]
        DEC["/decisions<br/>(SSR, protected)"]
        Auth["/sign-in  /sign-up<br/>(SSR, public)"]
    end

    subgraph API["API Routes"]
        AuthAPI["/api/auth/[...all]<br/>Better Auth handler"]
        NodesAPI["/api/nodes<br/>/api/nodes/[id]/action"]
        PoliciesAPI["/api/policies<br/>/api/policies/[id]"]
        DecisionsAPI["/api/decisions<br/>/api/decisions/[id]/action"]
        AuditAPI["/api/audit<br/>JSON + CSV export"]
        Snap["/api/telemetry/snapshot<br/>Initial hydration"]
        Stream["/api/telemetry/stream<br/>SSE — 1.5s ticks"]
    end

    subgraph Actions["Server Actions  app/actions/"]
        NAction["nodes.ts"]
        PAction["policies.ts"]
        DAction["decisions.ts"]
        AAction["audit.ts"]
    end

    subgraph DB["Neon PostgreSQL"]
        SN[("service_nodes")]
        SP[("shaping_policies")]
        DT[("decisions")]
        DS[("decision_steps")]
        AL[("audit_log")]
        UT[("user / session<br/>account / verification")]
    end

    Browser --> Edge
    Edge --> RateLimit
    Edge --> AuthGuard
    AuthGuard --> App
    RateLimit --> AuthAPI

    Browser --> SSEHook
    SSEHook -->|"GET initial"| Snap
    SSEHook -->|"EventSource"| Stream

    CC --> NodesAPI
    CC --> PoliciesAPI
    FC --> PoliciesAPI
    DEC --> DecisionsAPI
    DEC --> AuditAPI

    NodesAPI --> NAction --> SN
    NAction --> AL
    PoliciesAPI --> PAction --> SP
    PAction --> AL
    DecisionsAPI --> DAction --> DT
    DAction --> SN
    DAction --> AL
    AuditAPI --> AAction --> AL
    AuthAPI --> UT

    Snap --> SN
    Snap --> SP
    Stream --> SN
    Stream --> SP
```

---

### 2. Real-Time Telemetry Pipeline

All live data flows through a single SSE singleton (`use-live.ts`) that hydrates once via snapshot, then maintains a persistent EventSource connection with exponential-backoff reconnection.

```mermaid
sequenceDiagram
    participant Browser
    participant Hook as use-live.ts (singleton)
    participant Snap as /api/telemetry/snapshot
    participant SSE as /api/telemetry/stream (SSE)
    participant DB as Neon PostgreSQL

    Note over Browser,Hook: First component mounts — subscriber count 0→1

    Browser->>Hook: subscribe()
    Hook->>Snap: GET — initial hydration
    Snap->>DB: SELECT service_nodes, shaping_policies
    DB-->>Snap: rows
    Snap-->>Hook: JSON { nodes, policies, kpis }
    Hook->>Hook: applyPayload() — set state

    Hook->>SSE: new EventSource('/api/telemetry/stream')

    loop Every 1.5 seconds
        SSE->>DB: SELECT service_nodes, shaping_policies
        DB-->>SSE: rows
        SSE-->>Hook: data: { nodes, policies }
        Hook->>Hook: applyPayload() — notify all listeners
        Hook-->>Browser: useSyncExternalStore re-render
    end

    Note over Hook,SSE: Network drop → exponential backoff
    Note over Hook,SSE: Retry: 2s → 4s → 8s → 16s → 30s (cap)

    Note over Browser,Hook: Last component unmounts — subscriber 1→0
    Hook->>SSE: EventSource.close()
```

---

### 3. Operator Action Flow — Node Mitigation

When an operator applies a mitigation from the Command Console, the request travels through the API layer, is validated by session and schema, writes to the database, and the next SSE tick automatically reflects the change.

```mermaid
sequenceDiagram
    actor Operator
    participant Console as Command Console (UI)
    participant API as POST /api/nodes/[id]/action
    participant Action as nodes.ts (Server Action)
    participant DB as Neon PostgreSQL
    participant SSE as /api/telemetry/stream

    Operator->>Console: Click "Apply Mitigation"
    Console->>API: POST { action: "mitigate" }
    API->>Action: applyNodeAction(id, { action })

    Action->>Action: Validate session (Better Auth)
    Action->>Action: Zod-validate id + action enum

    Action->>DB: SELECT service_nodes WHERE id = ?
    DB-->>Action: node row

    Action->>DB: UPDATE service_nodes SET health='degraded', circuit='open', anomalyScore=0
    Action->>DB: INSERT audit_log { type, actor, subject, detail }
    Action->>Action: revalidatePath('/command-center')
    Action->>Action: revalidatePath('/decisions')

    Action-->>API: { ok: true, node }
    API-->>Console: 200 JSON
    Console-->>Operator: "Mitigation applied." toast

    Note over SSE,DB: Next SSE tick (≤1.5s) reads updated node
    SSE->>DB: SELECT service_nodes
    DB-->>SSE: updated row
    SSE-->>Console: data: { nodes: [...updated...] }
    Console-->>Operator: Live map updates in real time
```

---

### 4. Decision Reasoning Pipeline

Every decision stored in the database carries a full trace — from the initial anomaly signal through blast-radius estimation to the final intervention and its outcome.

```mermaid
flowchart TD
    A["Anomaly Signal Detected<br/>(anomaly_score > threshold)"] --> B["Phase 01 — SENSE<br/>Per-service seasonal model evaluates deviation"]
    B --> C{"Confidence ≥ threshold?"}
    C -- No --> D["Flag as low-confidence warning<br/>Continue monitoring"]
    C -- Yes --> E["Phase 02 — DECIDE<br/>Graph-aware engine estimates blast radius"]
    E --> F["Rank interventions by footprint:<br/>snooze → mitigate → isolate"]
    F --> G["Select minimum safe intervention"]
    G --> H["Phase 03 — ACT<br/>Apply circuit breaker / load shedding"]
    H --> I["UPDATE service_nodes in DB<br/>INSERT audit_log entry"]
    I --> J["Phase 04 — EXPLAIN<br/>Write decision + steps to decisions table"]
    J --> K["decision_steps: phase, label, detail,<br/>confidence, deltaMs per step"]
    K --> L["Operator Reviews in Decision Inspector"]
    L --> M{"Operator action?"}
    M -- Approve --> N["Status → approved<br/>Mitigation kept active"]
    M -- Rollback --> O["Status → rolled_back<br/>Node state reset to healthy"]
    M -- None --> P["Status remains active"]
```

---

### 5. Authentication & Route Guard Flow

Route protection is enforced at the Edge via `proxy.ts` before a request ever reaches the Next.js server — eliminating server-side rendering of protected content for unauthenticated users.

```mermaid
flowchart LR
    subgraph Public["Public Routes (no session required)"]
        Home["/"]
        SignIn["/sign-in"]
        SignUp["/sign-up"]
    end

    subgraph Protected["Protected Routes"]
        CC["/command-center"]
        FC["/flow-canvas"]
        DEC["/decisions"]
    end

    subgraph Edge["proxy.ts — Edge Middleware"]
        RL["Rate Limit Check<br/>10 req/60s/IP"]
        SC["Session Check<br/>auth.api.getSession()"]
        Redirect["Redirect to /sign-in<br/>?callbackUrl=pathname"]
        PassThrough["NextResponse.next()"]
    end

    subgraph Auth["Better Auth"]
        Client["authClient<br/>(browser)"]
        Server["/api/auth/[...all]<br/>(server)"]
        Cookie["HttpOnly Session Cookie"]
        DB[("user / session tables")]
    end

    Request["Incoming Request"] --> RL
    RL -- "429 Too Many Requests" --> Blocked["Blocked"]
    RL -- "OK" --> SC

    SC -- "No session + protected path" --> Redirect
    SC -- "Has session + auth path" --> CC
    SC -- "Pass" --> PassThrough

    Client -->|"signIn.email()"| RL
    RL --> Server
    Server --> DB
    Server -->|"Set-Cookie"| Cookie
    Cookie -->|"getCurrentUser()"| Protected

    SignIn -->|"on success → callbackUrl"| Protected
    SignUp -->|"on success"| CC
```

---

### 6. Database Schema

```mermaid
erDiagram
    user {
        text id PK
        text name
        text email UK
        boolean emailVerified
        text image
        timestamp createdAt
        timestamp updatedAt
    }

    session {
        text id PK
        timestamp expiresAt
        text token UK
        text ipAddress
        text userAgent
        text userId FK
        timestamp createdAt
        timestamp updatedAt
    }

    account {
        text id PK
        text accountId
        text providerId
        text userId FK
        text accessToken
        text refreshToken
        text password
        timestamp createdAt
        timestamp updatedAt
    }

    verification {
        text id PK
        text identifier
        text value
        timestamp expiresAt
        timestamp createdAt
        timestamp updatedAt
    }

    service_nodes {
        text id PK
        text name
        text layer
        text health
        text circuit
        numeric rps
        numeric p99
        numeric error_rate
        numeric anomaly_score
        text_array upstream
        timestamp updated_at
    }

    shaping_policies {
        text id PK
        text name
        text target
        text strategy
        numeric budget
        text priority
        text state
        numeric load
        text created_by FK
        timestamp created_at
        timestamp updated_at
    }

    decisions {
        text id PK
        text headline
        text outcome
        numeric confidence
        text latency_to_decide
        text model
        text requests_protected
        text status
        timestamp created_at
        timestamp updated_at
    }

    decision_steps {
        serial id PK
        text decisionId FK
        integer stepIndex
        text phase
        text label
        text detail
        numeric confidence
        integer deltaMs
    }

    audit_log {
        serial id PK
        text type
        text actor
        text subject
        text detail
        timestamp created_at
    }

    user ||--o{ session : "has"
    user ||--o{ account : "has"
    user ||--o{ shaping_policies : "creates"
    decisions ||--o{ decision_steps : "contains"
```

---

### 7. Component Hierarchy

```mermaid
graph TD
    Root["RootLayout — app/layout.tsx<br/>(Three.js AmbientScene)"]

    Root --> LP["/ Landing Page"]
    Root --> CP["/command-center"]
    Root --> FP["/flow-canvas"]
    Root --> DP["/decisions"]
    Root --> SI["/sign-in"]
    Root --> SU["/sign-up"]

    subgraph Landing["Landing (/)"]
        LP --> SN1["SiteNav"]
        LP --> HS["HeroSection"]
        LP --> FG["FeatureGrid"]
        LP --> CL["ClosedLoop"]
        LP --> CF["CtaFooter"]
        HS --> HSc["HeroScene (Three.js prism)"]
    end

    subgraph Command["/command-center"]
        CP --> SN2["SiteNav"]
        CP --> LMB["LiveMetricsBar"]
        CP --> KC["KpiCards"]
        CP --> CC["CommandConsole"]
        CP --> AF["AnomalyFeed"]
        CC --> NSM["NervousSystemMap (SVG canvas)"]
    end

    subgraph Flow["/flow-canvas"]
        FP --> SN3["SiteNav"]
        FP --> LMB2["LiveMetricsBar"]
        FP --> FB["FlowBoard"]
        FP --> NPM["NewPolicyModal"]
    end

    subgraph Decisions["/decisions"]
        DP --> SN4["SiteNav"]
        DP --> LMB3["LiveMetricsBar"]
        DP --> DI["DecisionInspector"]
        DI --> DT["DecisionTrace"]
        DI --> DS["DecisionSummary"]
        DI --> EAB["ExportAuditButton"]
    end

    subgraph AuthPages["/sign-in · /sign-up"]
        SI --> AF2["AuthForm (mode=sign-in)"]
        SU --> AF3["AuthForm (mode=sign-up)"]
    end

    subgraph LiveState["Shared Live State — use-live.ts"]
        UL["SSE Singleton<br/>useSyncExternalStore"]
    end

    KC -. useLive .-> UL
    CC -. useLive .-> UL
    AF -. useLive .-> UL
    FB -. useLive .-> UL
    HS -. useLive .-> UL
    FG -. useLive .-> UL
    DS -. useLive .-> UL
    LMB -. useLive .-> UL
    LMB2 -. useLive .-> UL
    LMB3 -. useLive .-> UL
```

---

## Features

### Real-Time Anomaly Detection

A persistent Server-Sent Events stream polls Neon every 1.5 seconds. Each service node carries a live `anomaly_score` — the Anomaly Feed surfaces the top signals by severity, with metric name, baseline vs. observed delta, and model confidence. There are no static thresholds: the system learns each service's seasonal envelope.

### Adaptive Traffic Shaping

The Flow Canvas lets operators compose priority lanes, fair-queuing strategies, and load-shedding budgets without touching a config file. Each policy deploys instantly via a PATCH request that mutates the `shaping_policies` table and triggers an SSE tick — the FlowBoard's live load bar reflects the change within 1.5 seconds.

### Self-Healing Circuit Breakers

The Nervous System Map is an SVG canvas wired directly to the SSE stream. When a node's `circuit` column transitions from `closed` → `open`, its edge colour shifts from cyan to coral in real time. Operators can apply (`mitigate`), temporarily hold (`snooze`), or reset any node with one click — each action is validated, written to the DB, and streamed back.

### Glass-Box Explainability

Every automated decision is persisted as a `decisions` row with up to N `decision_steps` rows (one per reasoning phase). The Decision Inspector renders the full trace in a scrollable timeline — phase badge, confidence bar, time delta, and the model's reasoning text. Operators can `approve` or `rollback` any decision; a rollback resets the affected node and updates both the decision status and the audit log.

### Durable Audit Log

Every state change — operator action or automated mitigation — is appended to `audit_log` with a typed entry (`type`, `actor`, `subject`, `detail`, `created_at`). The `/api/audit` endpoint serves the log as JSON or CSV (via `Accept` header negotiation). The Export button on the Decisions page downloads a date-stamped CSV.

### Edge Auth Rate Limiting

Auth endpoints (`/api/auth/*`) are guarded by an in-memory sliding-window rate limiter running at the Edge (`proxy.ts`). Limit: 10 requests per 60 seconds per IP. Exceeding the limit returns `429 Too Many Requests` with `Retry-After` and `X-RateLimit-Reset` headers.

---

## Pages

| Route | Visibility | Description |
|-------|------------|-------------|
| `/` | Public | Landing — live telemetry stats, feature grid, closed-loop explainer, CTA. CTAs are auth-aware (guests see Sign Up; operators see Command Center). |
| `/sign-in` | Public | Email + password sign-in. Redirects authenticated users away. Back-to-home link. |
| `/sign-up` | Public | Operator account registration. Redirects authenticated users away. |
| `/command-center` | Protected | Live service map (SVG), KPI cards, anomaly feed, node action controls. |
| `/flow-canvas` | Protected | Traffic shaping policy list, budget slider, live utilisation bar, create / delete policy. |
| `/decisions` | Protected | Decision inspector — browse up to 50 decisions, step trace timeline, approve / rollback, CSV export. |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, RSC, Server Actions) | 16.2.6 |
| Language | TypeScript | 5.7.3 |
| Styling | Tailwind CSS v4 + custom design tokens + glassmorphism | 4.2 |
| 3D / Visualisation | Three.js, React Three Fiber, React Three Drei | 0.185 |
| Database | PostgreSQL via Neon (serverless) | — |
| ORM | Drizzle ORM | 0.45 |
| Auth | Better Auth (email + password, HttpOnly session cookies) | 1.6 |
| Validation | Zod | v4 |
| Real-Time | Server-Sent Events — 1.5 s ticks, singleton with exponential backoff | — |
| Deployment | Vercel (Edge + Node.js runtime) | — |
| Analytics | Vercel Analytics | 1.6 |

---

## Project Structure

```
SentinalGateway/
│
├── app/
│   ├── actions/                    # Next.js Server Actions
│   │   ├── audit.ts                # Read audit_log entries
│   │   ├── decisions.ts            # CRUD + approve/rollback decisions
│   │   ├── nodes.ts                # Apply / snooze / reset service nodes
│   │   └── policies.ts             # CRUD shaping policies
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...all]/route.ts   # Better Auth catch-all handler
│   │   ├── audit/route.ts          # GET audit log (JSON or CSV)
│   │   ├── decisions/
│   │   │   ├── route.ts            # GET recent decisions with steps
│   │   │   └── [id]/action/route.ts # POST approve | rollback
│   │   ├── nodes/
│   │   │   ├── route.ts            # GET all service nodes
│   │   │   └── [id]/action/route.ts # POST mitigate | snooze | reset
│   │   ├── policies/
│   │   │   ├── route.ts            # GET list, POST create
│   │   │   └── [id]/route.ts       # PATCH update, DELETE delete
│   │   └── telemetry/
│   │       ├── snapshot/route.ts   # GET one-shot JSON hydration
│   │       └── stream/route.ts     # GET SSE stream — 1.5 s ticks
│   │
│   ├── command-center/page.tsx     # Protected — live map + KPIs
│   ├── decisions/page.tsx          # Protected — decision inspector
│   ├── flow-canvas/page.tsx        # Protected — traffic shaping
│   ├── sign-in/page.tsx            # Public — email sign-in
│   ├── sign-up/page.tsx            # Public — operator registration
│   ├── globals.css                 # Design tokens, glass utilities, keyframes
│   ├── layout.tsx                  # Root layout — AmbientScene, Analytics
│   └── page.tsx                    # Landing page (auth-aware CTAs)
│
├── components/
│   ├── command/
│   │   ├── anomaly-feed.tsx        # Live anomaly signal list
│   │   ├── command-console.tsx     # NervousSystemMap + node controls
│   │   └── kpi-cards.tsx           # RPS / p99 / error-rate / circuit cards
│   │
│   ├── decisions/
│   │   ├── decision-inspector.tsx  # Scrollable decision selector
│   │   ├── decision-summary.tsx    # Summary panel + approve/rollback
│   │   ├── decision-trace.tsx      # Step-by-step trace timeline
│   │   └── export-audit-button.tsx # CSV download with error feedback
│   │
│   ├── flow/
│   │   ├── flow-board.tsx          # Policy list + budget editor
│   │   └── new-policy-modal.tsx    # Create policy form
│   │
│   ├── landing/
│   │   ├── closed-loop.tsx         # Sense→Decide→Act→Explain stepper
│   │   ├── cta-footer.tsx          # Footer CTA + brand strip
│   │   ├── feature-grid.tsx        # 4-card live feature showcase
│   │   └── hero-section.tsx        # Hero copy + live stat row + 3D scene
│   │
│   ├── three/
│   │   ├── ambient-scene.tsx       # Background particle field (Three.js)
│   │   └── hero-scene.tsx          # Hero rotating prism (Three.js)
│   │
│   ├── ui/                         # shadcn/ui base primitives
│   ├── auth-form.tsx               # Sign-in / Sign-up form (shared)
│   ├── live-metrics-bar.tsx        # Sticky RPS/p99/error/circuit bar
│   ├── nervous-system-map.tsx      # SVG service mesh canvas
│   ├── page-header.tsx             # Eyebrow + title + description layout
│   ├── sentinel-logo.tsx           # Brand shield SVG mark
│   ├── sign-out-button.tsx         # Sign-out with hard redirect
│   ├── site-nav.tsx                # Responsive top navigation
│   └── sparkline.tsx               # Mini SVG sparkline with gradient fill
│
├── hooks/
│   └── use-live.ts                 # SSE singleton — subscribe/unsubscribe,
│                                   # applyPayload, exponential-backoff reconnect
│
├── lib/
│   ├── auth.ts                     # Better Auth server config + trusted origins
│   ├── auth-client.ts              # Better Auth browser client
│   ├── rate-limit.ts               # Sliding-window rate limiter (in-memory)
│   ├── session.ts                  # getCurrentUser() helper
│   ├── utils.ts                    # cn() className merger
│   └── db/
│       ├── index.ts                # Drizzle + pg Pool connection
│       └── schema.ts               # All table definitions (7 tables)
│
├── proxy.ts                        # Next.js Edge Middleware — auth guard + rate limit
├── vercel.json                     # Vercel deployment configuration
├── drizzle.config.ts               # Drizzle Kit schema + migrations config
├── next.config.mjs                 # Next.js config
├── tailwind.config.ts              # Tailwind CSS v4 config
├── tsconfig.json                   # TypeScript config
└── package.json                    # Dependencies and scripts
```

---

## API Reference

### Telemetry

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/telemetry/snapshot` | GET | Required | Single JSON snapshot of nodes + policies for initial hydration |
| `/api/telemetry/stream` | GET (SSE) | Required | Live EventSource stream — ticks every 1.5 seconds |

**SSE Event format:**
```json
{ "nodes": [...], "policies": [...] }
```

---

### Service Nodes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/nodes` | GET | Required | List all service nodes with health, circuit, RPS, p99, anomaly score |
| `/api/nodes/[id]/action` | POST | Required | Apply `mitigate`, `snooze`, or `reset` to a node |

**Action payload:**
```json
{ "action": "mitigate" }
```

Valid action values: `mitigate` · `snooze` · `reset`

---

### Shaping Policies

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/policies` | GET | Required | List policies (all for the current user) |
| `/api/policies` | POST | Required | Create a new shaping policy |
| `/api/policies/[id]` | PATCH | Required | Update `budget`, `state`, or `priority` |
| `/api/policies/[id]` | DELETE | Required | Delete policy (two-step confirm in UI) |

**Create payload:**
```json
{
  "name": "Checkout Protection",
  "target": "Cart → Payments",
  "strategy": "Priority lane + retry budget",
  "priority": "critical",
  "budget": 80
}
```

Valid priority values: `critical` · `high` · `medium` · `low`

Valid state values: `active` · `paused` · `learning`

---

### Decisions

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/decisions` | GET | Required | List up to 50 recent decisions, with their full step traces |
| `/api/decisions/[id]/action` | POST | Required | `approve` or `rollback` a decision |

**Action payload:**
```json
{ "action": "rollback" }
```

A `rollback` resets the affected node to `healthy` / `closed` / `anomalyScore: 0` in addition to updating the decision status.

---

### Audit Log

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/audit` | GET | Required | Full audit log. Send `Accept: text/csv` for CSV download, `Accept: application/json` (default) for JSON. |

---

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (or npm with `--legacy-peer-deps`)
- A **[Neon](https://neon.tech)** PostgreSQL database (free tier works)
- A **[Vercel](https://vercel.com)** account for deployment (optional for local dev)

---

### 1. Clone and Install

```bash
git clone https://github.com/BugHunterX2101/SentinalGateway.git
cd SentinalGateway
pnpm install
```

---

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the values:

```env
# ── Neon PostgreSQL ───────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"

# ── Better Auth ───────────────────────────────────────────────────────────────
# Generate a secret: openssl rand -base64 32
BETTER_AUTH_SECRET="your-32-char-minimum-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
```

---

### 3. Push the Database Schema

This command introspects `lib/db/schema.ts` and creates all tables in your Neon database:

```bash
pnpm dlx drizzle-kit push
```

Verify by checking your Neon console — you should see 9 tables:
`user`, `session`, `account`, `verification`, `service_nodes`, `shaping_policies`, `decisions`, `decision_steps`, `audit_log`

---

### 4. Seed Example Data (Optional)

```bash
# If a seed script is available in scripts/
node scripts/seed.js
```

This populates example service nodes, decisions with step traces, and a few shaping policies so the dashboard has something to display immediately.

---

### 5. Run Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), click **Get Started Free**, register an account, and explore the live control plane. The SSE stream begins ticking immediately.

---

## Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FBugHunterX2101%2FSentinalGateway)

#### Required Environment Variables

Set these in your Vercel project dashboard under **Settings → Environment Variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string with `?sslmode=require` |
| `BETTER_AUTH_SECRET` | Yes | 32+ character random secret. Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Your Vercel production URL, e.g. `https://sentinalgateway.vercel.app` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Same as above — exposed to the browser for auth client config |

> `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are injected by Vercel automatically. The auth server reads them to populate `trustedOrigins` — no manual configuration required.

#### Build Settings

Vercel auto-detects Next.js. If you encounter peer dependency issues, the `vercel.json` in this repo sets the install command to `npm install --legacy-peer-deps` to handle them gracefully.

---

## Design System

Sentinel Gateway uses a custom design system built on **Tailwind CSS v4** with a palette inspired by deep-ocean bioluminescence — dark indigo depths, electric cyan glows, and vivid coral alerts.

### Colour Tokens

| Token | Hex | Role |
|-------|-----|------|
| `--background` | `#f4f6fb` | Pearl white page canvas |
| `--foreground` | `#1a237e` | Deep indigo body text |
| `--primary` | `#1a237e` | Buttons, links, interactive primary |
| `--cyan` | `#00b8d4` | Healthy nodes, live indicators, brand accent |
| `--coral` | `#ff5252` | Critical anomalies, errors, destructive actions |
| `--amber` | `#ffab40` | Degraded state, warnings, elevated latency |
| `--tangerine` | `#ff7a1a` | Half-open circuit breaker state |
| `--muted-foreground` | `#5b6296` | Secondary text, labels |

### Glassmorphism Utilities

Two utility classes are available globally:

```css
/* Subtle layered glass — used for cards and panels */
.glass {
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.8) inset,
    0 20px 50px -24px rgba(26, 35, 126, 0.28);
}

/* Stronger glass — used for hero panels and CTA banners */
.glass-strong {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 24px 60px -28px rgba(26, 35, 126, 0.35);
}
```

### Custom Animations

| Class | Keyframe | Duration | Usage |
|-------|----------|----------|-------|
| `animate-sentinel-pulse` | Scale 1→1.35, opacity 1→0.55 | 1.6s | Live indicator dots |
| `animate-sentinel-float` | TranslateY 0→-8px | 6s | Floating 3D hero element |
| `animate-sentinel-dash` | stroke-dashoffset sweep | — | Animated SVG edges |

---

## Recent Changes

### v2.1 — UI/UX & Reliability Pass

- **Auth form redesign** — error messages use design-system coral tokens; back-to-overview link prevents user dead-ends; password hint on sign-up
- **Context-aware CTAs** — landing page hero adapts: guests see "Get Started Free" and "Sign In"; authenticated operators see "Open Command Center" and "Inspect Decisions"
- **Decisions page error boundary** — `getDecisions()` is now wrapped in `.catch(() => [])` so a database error shows a clean empty state instead of crashing the page
- **Export audit button** — no longer silently swallows errors; shows a coral error message; filenames include the date (`sentinel-audit-2026-07-18.csv`)
- **Budget slider floor** — minimum value raised from 0 to 10 to prevent accidental zero-allocation of a policy's capacity budget
- **`force-dynamic`** — command center and decisions pages opt out of static caching to ensure fresh auth checks on every request
- **LiveMetricsBar** — corrected thresholds (p99 > 150ms, error > 2%); changed "Mitigations" to "Circuits" for mobile clarity; added `aria-label` and `title` attributes

### v2.0 — Core Feature Release

- SSE exponential-backoff reconnect — stream auto-recovers after network drops (2s → 4s → 8s → 30s cap)
- Decision inspector — browse all 50 decisions, not just the latest; scrollable sidebar selector with keyed remounting
- Delete policy — two-step confirmation UI in the Flow Canvas editor
- SVG gradient fix — sparkline gradients no longer bleed across instances (using `useId()`)
- Dual `revalidatePath` — rolling back a decision refreshes both `/decisions` and `/command-center`
- Auth rate limiter — Edge middleware limits `/api/auth/*` to 10 req/min per IP with `Retry-After` headers
- Empty group guard — node inspector no longer renders a blank card when `layer` is unset

---

## Contributing

Contributions are welcome. Please follow this workflow:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Make your changes and verify: `pnpm build` must pass with zero TypeScript errors
4. Write a clear commit message following [Conventional Commits](https://www.conventionalcommits.org/)
5. Open a pull request against `main` with a description of what changed and why

---

## License

MIT © [BugHunterX2101](https://github.com/BugHunterX2101)

---

<div align="center">

**Sentinel Gateway** — Sense · Decide · Act · Explain

*A self-aware API gateway built with Next.js 16, Drizzle ORM, Better Auth, Three.js, and Neon PostgreSQL*

</div>
