// Fixture operational data: SLAs, incidents, recent tickets, teams, escalation.

// Hours to first response, by customer tier and priority.
export const SLA_HOURS = {
  enterprise: { P1: 1, P2: 4, P3: 12, P4: 48 },
  pro: { P1: 4, P2: 8, P3: 24, P4: 72 },
  free: { P1: 24, P2: 48, P3: 96, P4: 168 },
};

export const INCIDENTS = [
  { id: "INC-2041", product: "api", status: "investigating", severity: "major", title: "Elevated 5xx errors on the REST API in us-east-1", startedAt: "2026-10-15T09:12:00Z" },
  { id: "INC-2038", product: "dashboard", status: "resolved", severity: "minor", title: "Slow chart loading", startedAt: "2026-10-13T14:00:00Z" },
];

export const RECENT_TICKETS = [
  { id: "T-9001", subject: "API returning 503", category: "technical", product: "api", createdAt: "2026-10-15T09:20:00Z" },
  { id: "T-9002", subject: "503 errors from /v2/orders", category: "technical", product: "api", createdAt: "2026-10-15T09:31:00Z" },
  { id: "T-9003", subject: "Getting 503 service unavailable", category: "technical", product: "api", createdAt: "2026-10-15T09:44:00Z" },
  { id: "T-8990", subject: "Invoice shows wrong VAT", category: "billing", product: "billing", createdAt: "2026-10-14T16:02:00Z" },
  { id: "T-8975", subject: "Dark mode request", category: "feature_request", product: "dashboard", createdAt: "2026-10-12T11:10:00Z" },
];

export const TEAMS = [
  { id: "billing-ops", name: "Billing Operations", categories: ["billing"], skills: ["refunds", "invoices", "vat", "payment-failures"] },
  { id: "platform-support", name: "Platform Support (L2)", categories: ["technical", "bug"], skills: ["api", "sdk", "webhooks", "outages"] },
  { id: "account-services", name: "Account Services", categories: ["account"], skills: ["login", "sso", "2fa", "plan-changes"] },
  { id: "security-response", name: "Security Response", categories: ["security"], skills: ["breach", "vulnerability", "abuse"] },
  { id: "product-feedback", name: "Product Feedback", categories: ["feature_request"], skills: ["roadmap"] },
  { id: "general-support", name: "General Support (L1)", categories: ["other", "technical", "account", "billing"], skills: ["how-to"] },
];

export const TEAM_WORKLOAD = {
  "billing-ops": { openTickets: 18, agentsOnline: 3, onCall: "maria.k" },
  "platform-support": { openTickets: 41, agentsOnline: 5, onCall: "dev.r" },
  "account-services": { openTickets: 9, agentsOnline: 2, onCall: "lee.w" },
  "security-response": { openTickets: 2, agentsOnline: 1, onCall: "sec-oncall" },
  "product-feedback": { openTickets: 120, agentsOnline: 1, onCall: null },
  "general-support": { openTickets: 33, agentsOnline: 6, onCall: "ana.p" },
};

export const ESCALATION_POLICY = {
  P1: { notify: ["on-call engineer", "support manager"], pageOnCall: true, maxMinutesUnassigned: 15 },
  P2: { notify: ["team lead"], pageOnCall: false, maxMinutesUnassigned: 60 },
  P3: { notify: [], pageOnCall: false, maxMinutesUnassigned: 240 },
  P4: { notify: [], pageOnCall: false, maxMinutesUnassigned: 1440 },
};
