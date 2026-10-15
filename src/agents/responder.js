import { z } from "zod";
import { COMPANY_NAME } from "../config.js";
import { RESPONDER_PROMPT, fillTemplate, ticketBlock } from "../prompts.js";
import { responderTools } from "../tools/responder-tools.js";
import { Agent } from "./base.js";

export const ResponseSchema = z.object({
  replySubject: z.string(),
  replyBody: z.string(),
  kbArticleIds: z.array(z.string()).max(2),
  internalNote: z.string(),
});

export class ResponderAgent extends Agent {
  constructor({ model } = {}) {
    super({
      name: "responder",
      model,
      // {language} is per ticket, so it is filled in respond().
      systemPrompt: fillTemplate(RESPONDER_PROMPT, { company_name: COMPANY_NAME }),
      tools: responderTools(),
      outputName: "submit_response",
      outputSchema: ResponseSchema,
    });
  }

  respond(ticket, triage) {
    const systemPrompt = fillTemplate(this.systemPrompt, { language: triage.classification.language });
    return this.run(`${ticketBlock(ticket)}\n\nTriage:\n${JSON.stringify(triage, null, 2)}`, systemPrompt);
  }
}
