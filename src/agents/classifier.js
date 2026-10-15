import { z } from "zod";
import { CATEGORIES, COMPANY_NAME, SENTIMENTS } from "../config.js";
import { CLASSIFIER_PROMPT, fillTemplate, ticketBlock } from "../prompts.js";
import { classifierTools } from "../tools/classifier-tools.js";
import { Agent } from "./base.js";

export const ClassificationSchema = z.object({
  category: z.enum(CATEGORIES),
  subcategory: z.string().describe("Short label, e.g. 'refund', 'api-5xx', '2fa-reset'"),
  product: z.string(),
  language: z.string().describe("ISO 639-1 code"),
  sentiment: z.enum(SENTIMENTS),
  isSpam: z.boolean(),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  entities: z.object({ orderIds: z.array(z.string()), errorCodes: z.array(z.string()) }).partial().optional(),
});

export class ClassifierAgent extends Agent {
  constructor({ model, toolOptions } = {}) {
    super({
      name: "classifier",
      model,
      systemPrompt: fillTemplate(CLASSIFIER_PROMPT, {
        company_name: COMPANY_NAME,
        categories: CATEGORIES.join(", "),
        sentiments: SENTIMENTS.join(", "),
      }),
      tools: classifierTools(toolOptions),
      outputName: "submit_classification",
      outputSchema: ClassificationSchema,
    });
  }

  classify(ticket) {
    return this.run(ticketBlock(ticket));
  }
}
