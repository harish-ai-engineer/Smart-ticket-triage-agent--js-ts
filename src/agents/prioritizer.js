import { z } from "zod";
import { COMPANY_NAME, PRIORITIES } from "../config.js";
import { PRIORITIZER_PROMPT, fillTemplate, ticketBlock } from "../prompts.js";
import { prioritizerTools } from "../tools/prioritizer-tools.js";
import { Agent } from "./base.js";

export const PrioritySchema = z.object({
  level: z.enum(PRIORITIES),
  slaHours: z.number().positive(),
  customerTier: z.enum(["enterprise", "pro", "free"]),
  customerName: z.string().nullable(),
  relatedIncidentId: z.string().nullable(),
  isSpike: z.boolean(),
  reasons: z.array(z.string()).min(1),
});

export class PrioritizerAgent extends Agent {
  constructor({ model } = {}) {
    super({
      name: "prioritizer",
      model,
      systemPrompt: fillTemplate(PRIORITIZER_PROMPT, { company_name: COMPANY_NAME }),
      tools: prioritizerTools(),
      outputName: "submit_priority",
      outputSchema: PrioritySchema,
    });
  }

  prioritize(ticket, classification) {
    return this.run(`${ticketBlock(ticket)}\n\nClassification:\n${JSON.stringify(classification, null, 2)}`);
  }
}
