import { z } from "zod";
import { COMPANY_NAME, MIN_AUTO_CONFIDENCE } from "../config.js";
import { ROUTER_PROMPT, fillTemplate, ticketBlock } from "../prompts.js";
import { routerTools } from "../tools/router-tools.js";
import { Agent } from "./base.js";

export const RoutingSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  assignee: z.string().nullable().describe("On-call person for P1, otherwise null (team queue)"),
  notify: z.array(z.string()),
  pageOnCall: z.boolean(),
  needsHumanReview: z.boolean(),
  reason: z.string(),
});

export class RouterAgent extends Agent {
  constructor({ model } = {}) {
    super({
      name: "router",
      model,
      systemPrompt: fillTemplate(ROUTER_PROMPT, { company_name: COMPANY_NAME, min_confidence: MIN_AUTO_CONFIDENCE }),
      tools: routerTools(),
      outputName: "submit_routing",
      outputSchema: RoutingSchema,
    });
  }

  route(ticket, classification, priority) {
    const context = JSON.stringify({ classification, priority }, null, 2);
    return this.run(`${ticketBlock(ticket)}\n\nTriage so far:\n${context}`);
  }
}
