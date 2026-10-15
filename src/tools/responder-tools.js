import { z } from "zod";
import { COMPANY_NAME } from "../config.js";
import { KB_ARTICLES, RESPONSE_TEMPLATES } from "../data/knowledge-base.js";
import { fillTemplate } from "../prompts.js";
import { BaseTool, tokenize } from "./base.js";

export class SearchKnowledgeBaseTool extends BaseTool {
  name = "search_knowledge_base";
  description = "Search help-center articles. Returns the best matching articles (id, title, body) to cite in a reply.";
  schema = z.object({ query: z.string(), limit: z.number().int().min(1).max(5).optional() });

  async execute({ query, limit = 3 }) {
    const terms = tokenize(query);
    const scored = KB_ARTICLES.map((article) => {
      const haystack = new Set([...tokenize(article.title), ...article.tags.flatMap(tokenize), ...article.tags]);
      return { ...article, score: terms.filter((t) => haystack.has(t)).length };
    })
      .filter((a) => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return { results: scored.map(({ tags, ...rest }) => rest) };
  }
}

export class GetResponseTemplateTool extends BaseTool {
  name = "get_response_template";
  description =
    "Fill a reply template. Templates: acknowledge, incident, escalated, feature_request. Pass the variables the template needs; " +
    "company_name is filled in automatically. Returns the rendered text.";
  schema = z.object({
    template: z.enum(["acknowledge", "incident", "escalated", "feature_request"]),
    variables: z.record(z.string(), z.union([z.string(), z.number()])).describe("e.g. { customer_name, subject, body, incident_id, team_name, sla_hours }"),
  });

  async execute({ template, variables }) {
    const text = fillTemplate(RESPONSE_TEMPLATES[template], { company_name: COMPANY_NAME, ...variables });
    const missing = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    return { template, text, missingVariables: missing };
  }
}


export class CheckRefundEligibilityTool extends BaseTool {
  name = "check_refund_eligibility";
  description = "Whether a charge can be refunded under policy: annual plans pro rata within 30 days, monthly plans within 7 days, never for past-due accounts.";
  schema = z.object({
    plan: z.enum(["monthly", "annual"]),
    daysSinceCharge: z.number().int().min(0),
    accountStatus: z.string().optional(),
  });

  async execute({ plan, daysSinceCharge, accountStatus }) {
    if (accountStatus === "past_due") return { eligible: false, reason: "Account is past due; billing must review it." };
    const windowDays = plan === "annual" ? 30 : 7;
    return daysSinceCharge <= windowDays
      ? { eligible: true, windowDays, prorated: plan === "annual" }
      : { eligible: false, windowDays, reason: `Outside the ${windowDays}-day refund window.` };
  }
}

export function responderTools() {
  return [new SearchKnowledgeBaseTool(), new GetResponseTemplateTool(), new CheckRefundEligibilityTool()];
}
