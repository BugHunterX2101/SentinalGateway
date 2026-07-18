<div align="center">

<img src="public/og-image.png" alt="Sentinel Gateway" width="100%" style="border-radius:12px;max-height:320px;object-fit:cover;" />

# Sentinel Gateway

### The Self-Aware API Gateway

**Real-time anomaly detection · Adaptive traffic shaping · Self-healing circuit breakers · Glass-box explainability**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-C5F74F?style=flat-square)](https://orm.drizzle.team)
[![Better Auth](https://img.shields.io/badge/Better_Auth-v1-blueviolet?style=flat-square)](https://better-auth.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FBugHunterX2101%2FSentinalGateway)

> *"Give your APIs a nervous system."*

</div>

---

## Overview

Sentinel Gateway is an **intelligent, self-aware API gateway** that does more than route traffic — it thinks about it. Built on Next.js 16 with a live PostgreSQL backend (Neon), it continuously observes every service in your mesh, detects anomalies in real time, shapes traffic adaptively, and heals circuits automatically — all while keeping humans in the loop with a step-by-step reasoning trace for every automated decision.

### What makes it different

| Traditional Gateway | Sentinel Gateway |
|---------------------|-----------------|
| Static rate limits | Learned seasonal baselines per service |
| Manual circuit breakers | Graph-aware auto-isolation + self-healing |
| Config file changes | Live policy deploy without restarts |
| Black-box decisions | Full reasoning trace with confidence scores |
| Ops team paged at 3 AM | Incidents contained before the page fires |

---

## Live Demo

> **[sentinalgateway.vercel.app](https://sentinalgateway.vercel.app)** — create a free account and explore the live control plane.

---

## Architecture

### High-Level System Overview

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Browser["Browser / UI"]
    end

    subgraph NextJS["Next.js 16 Application"]
        Landing["Landing Page\n(SSR)"]
        CommandCenter["Command Center\n(SSR + SSE)"]
        FlowCanvas["Flow Canvas\n(SSR)"]
        Decisions["Decisions\n(SSR)"]
        AuthPages["Sign In / Sign Up\n(SSR)"]
    end

    subgraph API["API Routes"]
        AuthAPI["/api/auth/[...all]\nBetter Auth"]
        NodesAPI["/api/nodes\n/api/nodes/[id]/action"]
        PoliciesAPI["/api/policies\n/api/policies/[id]"]
        DecisionsAPI["/api/decisions\n/api/decisions/[id]/action"]
        AuditAPI["/api/audit"]
        TelemetrySSE["/api/telemetry/stream\nSSE · 1.5s ticks"]
        TelemetrySnap["/api/telemetry/snapshot\nInitial hydration"]
    end

    subgraph Middleware["Edge Middleware"]
        RateLimit["Auth Rate Limiter\n10 req/min/IP"]
    end

    subgraph ServerActions["Server Actions"]
        NodesAction["nodes.ts"]
        PoliciesAction["policies.ts"]
        DecisionsAction["decisions.ts"]
        AuditAction["audit.ts"]
    end

    subgraph DB["Neon PostgreSQL"]
        ServiceNodes[("service_nodes")]
        ShapingPolicies[("shaping_policies")]
        DecisionsTable[("decisions")]
        DecisionSteps[("decision_steps")]
        AuditLog[("audit_log")]
        AuthTables[("user / session\n/ account / verification")]
    end

    Browser --> RateLimit
    RateLimit --> AuthAPI
    Browser --> Landing
    Browser --> CommandCenter
    Browser --> FlowCanvas
    Browser --> Decisions
    Browser --> AuthPages

    CommandCenter --> TelemetrySSE
    CommandCenter --> TelemetrySnap
    FlowCanvas --> TelemetrySSE

    TelemetrySSE --> ServiceNodes
    TelemetrySSE --> ShapingPolicies
    TelemetrySnap --> ServiceNodes
    TelemetrySnap --> ShapingPolicies

    NodesAPI --> NodesAction --> ServiceNodes
    NodesAction --> AuditLog
    PoliciesAPI --> PoliciesAction --> ShapingPolicies
    PoliciesAction --> AuditLog
    DecisionsAPI --> DecisionsAction --> DecisionsTable
    DecisionsAction --> ServiceNodes
    DecisionsAction --> AuditLog
    AuditAPI --> AuditAction --> AuditLog
    AuthAPI --> AuthTables
```

---

### Data Flow — Live Telemetry Pipeline

```mermaid
sequenceDiagram
    participant Browser
    participant Hook as use-live.ts<br/>(singleton)
    participant Snap as /api/telemetry/snapshot
    participant SSE as /api/telemetry/stream<br/>(SSE)
    participant DB as Neon PostgreSQL

    Browser->>Hook: subscribe() [first mount]
    Hook->>Snap: GET (initial hydration)
    Snap->>DB: SELECT service_nodes, shaping_policies
    DB-->>Snap: rows
    Snap-->>Hook: JSON payload
    Hook->>Hook: applyPayload() → update state

    Hook->>SSE: EventSource connect
    loop every 1.5 s
        SSE->>DB: SELECT service_nodes, shaping_policies
        DB-->>SSE: rows
        SSE-->>Hook: data: {nodes, policies}
        Hook->>Hook: applyPayload() → notify listeners
        Hook-->>Browser: useSyncExternalStore re-render
    end

    Note over Hook,SSE: On disconnect → exponential backoff<br/>retry: 2s → 4s → 8s → 16s → 30s cap
```

---

### Operator Action Flow — Node Mitigation

```mermaid
sequenceDiagram
    actor Operator
    participant UI as Command Console
    participant API as POST /api/nodes/[id]/action
    participant Action as nodes.ts server action
    participant DB as Neon PostgreSQL
    participant SSE as Telemetry Stream

    Operator->>UI: Click "Apply mitigation"
    UI->>API: POST {action: "mitigate"}
    API->>Action: applyNodeAction(id, {action})
    Action->>Action: Validate session (Better Auth)
    Action->>Action: Zod-validate id + action
    Action->>DB: SELECT service_nodes WHERE id = ?
    DB-->>Action: node row
    Action->>DB: UPDATE service_nodes SET health, circuit, anomalyScore
    Action->>DB: INSERT audit_log
    Action->>Action: revalidatePath('/command-center')
    Action-->>API: updated node
    API-->>UI: {ok: true, node}
    UI-->>Operator: "Mitigation applied." feedback

    Note over SSE,DB: Next SSE tick (≤1.5s) reads<br/>updated node from DB → stream reflects change
```

---

### Authentication Flow

```mermaid
flowchart LR
    subgraph PublicRoutes["Public Routes"]
        Landing["/"]
        SignIn["/sign-in"]
        SignUp["/sign-up"]
    end

    subgraph ProtectedRoutes["Protected Routes (redirect → /sign-in)"]
        CommandCenter["/command-center"]
        FlowCanvas["/flow-canvas"]
        Decisions["/decisions"]
    end

    subgraph AuthFlow["Better Auth Flow"]
        Client["Auth Client\n(browser)"]
        Server["Auth Server\n(/api/auth/...)"]
        Session["Session Cookie\n(HttpOnly)"]
        DB[("user / session\ntables")]
    end

    subgraph Middleware["Edge Middleware"]
        RateLimit["Rate Limit\n10 req/min/IP → 429"]
    end

    Client -->|"signIn.email()"| RateLimit
    RateLimit --> Server
    Server --> DB
    Server -->|"Set-Cookie"| Session
    Session -->|"getCurrentUser()"| ProtectedRoutes

    SignIn -->|"on success"| CommandCenter
    SignUp -->|"on success"| CommandCenter
```

---

### Database Schema

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

### Component Hierarchy

```mermaid
graph TD
    RootLayout["RootLayout\napp/layout.tsx"]
    AmbientScene["AmbientScene\n(Three.js particles)"]

    RootLayout --> AmbientScene
    RootLayout --> HomePage
    RootLayout --> CommandCenterPage
    RootLayout --> FlowCanvasPage
    RootLayout --> DecisionsPage
    RootLayout --> SignInPage
    RootLayout --> SignUpPage

    subgraph HomeLanding["Landing (/)"]
        HomePage --> SiteNav
        HomePage --> HeroSection
        HomePage --> FeatureGrid
        HomePage --> ClosedLoop
        HomePage --> CtaFooter
        HeroSection --> HeroScene["HeroScene\n(Three.js prism)"]
    end

    subgraph CommandCenterSection["/command-center"]
        CommandCenterPage --> LiveMetricsBar
        CommandCenterPage --> KpiCards
        CommandCenterPage --> CommandConsole
        CommandCenterPage --> AnomalyFeed
        CommandConsole --> NervousSystemMap["NervousSystemMap\n(SVG canvas)"]
    end

    subgraph FlowSection["/flow-canvas"]
        FlowCanvasPage --> FlowBoard
        FlowCanvasPage --> NewPolicyModal
    end

    subgraph DecisionsSection["/decisions"]
        DecisionsPage --> DecisionInspector
        DecisionInspector --> DecisionTrace
        DecisionInspector --> DecisionSummary
        DecisionInspector --> ExportAuditButton
    end

    subgraph AuthSection["/sign-in · /sign-up"]
        SignInPage --> AuthForm
        SignUpPage --> AuthForm
    end

    subgraph SharedHook["Shared State (useLive singleton)"]
        UseLive["use-live.ts\nSSE + applyPayload"]
    end

    KpiCards -.->|useLive| UseLive
    CommandConsole -.->|useLiveWithDb| UseLive
    AnomalyFeed -.->|useLive| UseLive
    FlowBoard -.->|useLiveWithDb| UseLive
    HeroSection -.->|useLive| UseLive
    FeatureGrid -.->|useLive| UseLive
    DecisionSummary -.->|useLive| UseLive
    LiveMetricsBar -.->|useLive| UseLive
    AmbientScene -.->|useLive| UseLive
```

---

## Features

### Real-Time Anomaly Detection
A streaming telemetry pipeline (Server-Sent Events, 1.5 s ticks) reads live node health from Neon and surfaces anomalies in the **Anomaly Stream** feed. Each signal includes severity, metric, baseline vs. observed value, and confidence score.

### Adaptive Traffic Shaping
Create **shaping policies** with priority lanes, fair queueing, and load-shedding rules. Each policy has a configurable capacity budget; the live load bar tracks real utilization in real time. Changes deploy instantly — no config push, no restart.

### Self-Healing Circuit Breakers
The **Nervous System Map** is a live SVG canvas showing every service node, its health, and traffic edges. When a node degrades, the gateway isolates it (circuit open), then probes (half-open) and auto-recovers when signals normalise. Operators can apply, snooze, or roll back mitigations with one click.

### Glass-Box Explainability
Every automated decision is stored with a full **step-by-step reasoning trace**: phase (Sense → Decide → Act → Explain), weighted signals, confidence per step, and latency overhead. Operators can approve or roll back any action — and the rollback also resets the affected node's state in the database.

### Durable Audit Log
Every operator action and automated mitigation is written to `audit_log`. The Decisions page offers a one-click **CSV export** of the full audit trail.

---

## Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Landing — live telemetry stats, features, CTA |
| `/sign-in` | Public | Email + password authentication |
| `/sign-up` | Public | Operator account registration |
| `/command-center` | Required | Live service map, KPI cards, anomaly feed |
| `/flow-canvas` | Required | Traffic shaping policy management |
| `/decisions` | Required | Decision inspector with full reasoning traces |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, RSC, Server Actions) |
| **Language** | TypeScript 5.7 |
| **Styling** | Tailwind CSS v4, custom design tokens, glassmorphism |
| **3D / Visualisation** | Three.js, React Three Fiber, React Three Drei |
| **Database** | PostgreSQL via Neon (serverless) |
| **ORM** | Drizzle ORM |
| **Auth** | Better Auth v1 (email+password, session cookies) |
| **Validation** | Zod v4 |
| **Real-Time** | Server-Sent Events (SSE) — 1.5 s ticks |
| **Analytics** | Vercel Analytics |
| **Deployment** | Vercel (Edge + Node.js runtime) |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- A [Neon](https://neon.tech) PostgreSQL database
- A [Vercel](https://vercel.com) account (for deployment)

### 1. Clone & Install

```bash
git clone https://github.com/BugHunterX2101/SentinalGateway.git
cd SentinalGateway
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Neon PostgreSQL
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"

# Better Auth — generate: openssl rand -base64 32
BETTER_AUTH_SECRET="your-32-char-minimum-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
```

### 3. Set Up Database

Push the schema to your Neon database:

```bash
pnpm dlx drizzle-kit push
```

Optionally seed some example service nodes, decisions and policies (check `scripts/` for helpers).

### 4. Run Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and explore.

---

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FBugHunterX2101%2FSentinalGateway)

Set the following environment variables in your Vercel project:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | 32+ char random secret |
| `BETTER_AUTH_URL` | Yes | Your production URL |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Same as above (exposed to browser) |

> **Note:** `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are automatically set by Vercel — no manual configuration needed.

---

## Project Structure

```
SentinalGateway/
├── app/
│   ├── actions/          # Server actions (nodes, policies, decisions, audit)
│   ├── api/
│   │   ├── auth/         # Better Auth catch-all handler
│   │   ├── nodes/        # GET nodes · POST action
│   │   ├── policies/     # GET/POST policies · PATCH/DELETE policy
│   │   ├── decisions/    # GET decisions · POST action
│   │   ├── audit/        # GET audit log (JSON + CSV)
│   │   └── telemetry/
│   │       ├── snapshot/ # One-shot JSON hydration
│   │       └── stream/   # SSE live telemetry (1.5s)
│   ├── command-center/   # page.tsx
│   ├── decisions/        # page.tsx
│   ├── flow-canvas/      # page.tsx
│   ├── sign-in/          # page.tsx
│   ├── sign-up/          # page.tsx
│   ├── globals.css       # Design tokens, glass utilities, animations
│   ├── layout.tsx        # Root layout (AmbientScene)
│   └── page.tsx          # Landing page
│
├── components/
│   ├── command/          # KpiCards, CommandConsole, AnomalyFeed
│   ├── decisions/        # DecisionInspector, DecisionTrace, DecisionSummary
│   ├── flow/             # FlowBoard, NewPolicyModal
│   ├── landing/          # HeroSection, FeatureGrid, ClosedLoop, CtaFooter
│   ├── three/            # AmbientScene, HeroScene (Three.js)
│   └── ui/               # Base UI components
│
├── hooks/
│   └── use-live.ts       # SSE singleton with exponential-backoff reconnect
│
├── lib/
│   ├── auth.ts           # Better Auth server config
│   ├── auth-client.ts    # Better Auth client config
│   ├── db/
│   │   ├── index.ts      # Drizzle + pg Pool connection
│   │   └── schema.ts     # All table definitions
│   ├── session.ts        # getCurrentUser / requireCurrentUser
│   └── utils.ts          # cn() helper
│
├── middleware.ts          # Edge rate limiting (/api/auth/* → 10 req/min)
├── drizzle.config.ts
├── next.config.mjs
└── package.json
```

---

## API Reference

### Telemetry

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/telemetry/snapshot` | GET | Yes | Single JSON snapshot of nodes + policies |
| `/api/telemetry/stream` | GET (SSE) | Yes | Live stream, 1.5 s ticks |

### Service Nodes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/nodes` | GET | Yes | List all service nodes |
| `/api/nodes/[id]/action` | POST | Yes | Apply `mitigate` / `snooze` / `reset` |

**Action body:**
```json
{ "action": "mitigate" }
```

### Shaping Policies

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/policies` | GET | Yes | List policies (scoped to current user) |
| `/api/policies` | POST | Yes | Create policy |
| `/api/policies/[id]` | PATCH | Yes | Update `budget`, `state`, `priority` |
| `/api/policies/[id]` | DELETE | Yes | Delete policy |

**Create body:**
```json
{
  "name": "Checkout protection",
  "target": "Cart → Payments",
  "strategy": "Priority lane + retry budget",
  "priority": "critical",
  "budget": 80
}
```

### Decisions

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/decisions` | GET | Yes | List recent decisions (up to 50, with steps) |
| `/api/decisions/[id]/action` | POST | Yes | `approve` or `rollback` |

### Audit

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/audit` | GET | Yes | Audit log — `Accept: application/json` or `Accept: text/csv` |

---

## Design System

Sentinel Gateway uses a custom design system built on Tailwind CSS v4 with a palette inspired by **deep ocean bioluminescence**:

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#f4f6fb` | Pearl white page background |
| `--foreground` | `#1a237e` | Deep indigo text |
| `--cyan` | `#00b8d4` | Primary brand / healthy nodes |
| `--coral` | `#ff5252` | Critical / errors |
| `--amber` | `#ffab40` | Degraded / warnings |
| `--indigo` | `#1a237e` | Primary brand / low priority |
| `--tangerine` | `#ff7a1a` | Half-open circuit state |

### Glassmorphism Utilities

```css
.glass        { background: rgba(255,255,255,0.62); backdrop-filter: blur(18px); }
.glass-strong { background: rgba(255,255,255,0.82); backdrop-filter: blur(24px); }
```

---

## Recent Changes (v2.0)

- **SSE exponential-backoff reconnect** — stream auto-recovers after network blips (2s → 4s → 8s → 30s cap)
- **Decision inspector** — browse all 50 decisions, not just the latest; new scrollable sidebar selector
- **Delete policy** — two-step confirmation delete in the Flow Canvas editor
- **SVG gradient fix** — sparkline gradients no longer bleed across instances (`useId()`)
- **Dual `revalidatePath`** — rolling back a decision now also refreshes the Command Center
- **Auth rate limiter** — Next.js edge middleware limits `/api/auth/*` to 10 req/min per IP
- **Empty group guard** — node inspector no longer renders a blank line when `layer` is unset

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes, run `pnpm build` to verify
4. Open a pull request against `main`

---

## License

MIT © [BugHunterX2101](https://github.com/BugHunterX2101)

---

<div align="center">

**Sentinel Gateway** — Sense · Decide · Act · Explain

*A self-aware API gateway built with Next.js, Drizzle ORM, Better Auth, and Three.js*

</div>
