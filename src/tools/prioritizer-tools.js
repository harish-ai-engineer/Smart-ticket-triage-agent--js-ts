import { z } from "zod";
import { CUSTOMERS } from "../data/customers.js";
import { INCIDENTS, RECENT_TICKETS, SLA_HOURS } from "../data/operations.js";
import { BaseTool, tokenize } from "./base.js";

export class LookupCustomerTool extends BaseTool {
  name = "lookup_customer";
  description = "Look up the customer behind a ticket by email: name, plan tier, account status, open tickets, monthly spend.";
  schema = z.object({ email: z.string() });

  async execute({ email }) {
    const customer = CUSTOMERS.find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
    return customer ?? { email, name: null, tier: "free", accountStatus: "unknown", openTickets: 0, monthlySpendUsd: 0, found: false };
  }
}

export class GetSlaPolicyTool extends BaseTool {
  name = "get_sla_policy";
  description = "First-response SLA in hours for a customer tier at each priority level (or one level if given).";
  schema = z.object({
    tier: z.enum(["enterprise", "pro", "free"]),
    priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
  });

  async execute({ tier, priority }) {
    const table = SLA_HOURS[tier];
    return priority ? { tier, priority, slaHours: table[priority] } : { tier, slaHours: table };
  }
}

export class CheckServiceStatusTool extends BaseTool {
  name = "check_service_status";
  description = "List active (unresolved) incidents, optionally for one product (api, dashboard, billing, auth, webhooks).";
  schema = z.object({ product: z.string().optional() });

  async execute({ product }) {
    const active = INCIDENTS.filter((i) => i.status !== "resolved" && (!product || i.product === product.toLowerCase()));
    return { activeIncidents: active, allOperational: active.length === 0 };
  }
}

export class FindSimilarTicketsTool extends BaseTool {
  name = "find_similar_tickets";
  description =
    "Find recent tickets similar to this one, to spot a spike of reports about the same problem. Returns matches and whether it looks like a spike.";
  schema = z.object({ query: z.string().describe("Key words from the ticket, e.g. '503 api orders'") });

  async execute({ query }) {
    const terms = new Set(tokenize(query));
    const matches = RECENT_TICKETS.map((t) => ({ ...t, overlap: tokenize(`${t.subject} ${t.product}`).filter((w) => terms.has(w)).length }))
      .filter((t) => t.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 5);
    return { matches, isSpike: matches.length >= 3 };
  }
}

export function prioritizerTools() {
  return [new LookupCustomerTool(), new GetSlaPolicyTool(), new CheckServiceStatusTool(), new FindSimilarTicketsTool()];
}
