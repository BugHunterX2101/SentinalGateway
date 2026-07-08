import {
  pgTable,
  text,
  timestamp,
  boolean,
  numeric,
  integer,
  serial,
} from 'drizzle-orm/pg-core'

// ─── Better Auth required tables ──────────────────────────────────────────────
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// ─── App tables ────────────────────────────────────────────────────────────────

export const serviceNodes = pgTable('service_nodes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  layer: text('layer').notNull(),
  health: text('health').notNull().default('healthy'),
  circuit: text('circuit').notNull().default('closed'),
  rps: numeric('rps').notNull().default('0'),
  p99: numeric('p99').notNull().default('0'),
  errorRate: numeric('error_rate').notNull().default('0'),
  anomalyScore: numeric('anomaly_score').notNull().default('0'),
  upstream: text('upstream').array().notNull().default([]),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const shapingPolicies = pgTable('shaping_policies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  target: text('target').notNull(),
  strategy: text('strategy').notNull(),
  budget: numeric('budget').notNull().default('100'),
  priority: text('priority').notNull().default('medium'),
  state: text('state').notNull().default('learning'),
  load: numeric('load').notNull().default('0'),
  createdBy: text('created_by').notNull().default('operator'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const decisions = pgTable('decisions', {
  id: text('id').primaryKey(),
  headline: text('headline').notNull(),
  outcome: text('outcome').notNull().default('Pending'),
  confidence: numeric('confidence').notNull().default('0'),
  latencyToDecide: text('latency_to_decide').notNull().default('0ms'),
  model: text('model').notNull().default('SentinelBrain-v3'),
  requestsProtected: text('requests_protected').notNull().default('0'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const decisionSteps = pgTable('decision_steps', {
  id: serial('id').primaryKey(),
  decisionId: text('decision_id').notNull(),
  stepIndex: integer('step_index').notNull(),
  phase: text('phase').notNull(),
  label: text('label').notNull(),
  detail: text('detail').notNull(),
  confidence: numeric('confidence').notNull().default('0'),
  deltaMs: integer('delta_ms').notNull().default(0),
})

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  actor: text('actor').notNull().default('sentinel'),
  subject: text('subject').notNull(),
  detail: text('detail').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
