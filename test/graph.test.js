import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildTriageGraph } from "../src/graph.js";
import { ScriptedChatModel } from "./scripted-model.js";

const ticket = JSON.parse(readFileSync(new URL("../examples/api-outage.json", import.meta.url), "utf8"));
const spam = JSON.parse(readFileSync(new URL("../examples/spam.json", import.meta.url), "utf8"));

const classification = {
  category: "technical", subcategory: "api-5xx", product: "api", language: "en", sentiment: "angry",
  isSpam: false, confidence: 0.92, summary: "Enterprise checkout down: /v2/orders returns 503.",
};
const priority = {
  level: "P1", slaHours: 1, customerTier: "enterprise", customerName: "BigRetail Inc.",
  relatedIncidentId: "INC-2041", isSpike: true, reasons: ["Matches INC-2041", "Enterprise tier"],
};
const routing = {
  teamId: "platform-support", teamName: "Platform Support (L2)", assignee: "dev.r",
  notify: ["on-call engineer", "support manager"], pageOnCall: true, needsHumanReview: false, reason: "API outage",
};
const response = {
  replySubject: "Re: production checkout down", replyBody: "Hi BigRetail Inc., we are aware of INC-2041...",
  kbArticleIds: ["KB-201"], internalNote: "Linked to INC-2041; paged dev.r.",
};

function models(overrides = {}) {
  const scripts = {
    classifier: [[["detect_language", { text: ticket.body }], ["check_spam_signals", { text: ticket.body }]], [["submit_classification", classification]]],
    prioritizer: [
      [["lookup_customer", { email: ticket.customerEmail }], ["check_service_status", { product: "api" }], ["find_similar_tickets", { query: "api 503" }]],
      [["get_sla_policy", { tier: "enterprise", priority: "P1" }]],
      [["submit_priority", priority]],
    ],
    router: [[["list_teams", { category: "technical" }], ["get_team_workload", { teamId: "platform-support" }], ["get_escalation_policy", { priority: "P1" }]], [["submit_routing", routing]]],
    responder: [[["search_knowledge_base", { query: "api 503" }]], [["submit_response", response]]],
    ...overrides,
  };
  const built = Object.fromEntries(Object.entries(scripts).map(([role, script]) => [role, new ScriptedChatModel(script)]));
  return { built, modelFor: (role) => built[role] };
}

test("a real ticket runs through all four agents", async () => {
  const { built, modelFor } = models();
  const state = await buildTriageGraph({ modelFor }).invoke({ ticket });

  assert.equal(state.status, "auto_triaged");
  assert.deepEqual(state.errors, []);
  assert.equal(state.priority.level, "P1");
  assert.equal(state.routing.assignee, "dev.r");
  assert.deepEqual(state.response.kbArticleIds, ["KB-201"]);
  assert.deepEqual([...new Set(state.trace.map((t) => t.agent))], ["classifier", "prioritizer", "router", "responder"]);
  assert.equal(state.trace.length, 10);

  // Tool results reached the model, and each agent saw its own tools plus its submit tool.
  const prioritizerSecondTurn = built.prioritizer.calls[1];
  assert.match(prioritizerSecondTurn.at(-3).content, /"tier":"enterprise"/);
  assert.ok(built.router.boundTools.includes("submit_routing"));
  // The ticket is fenced as untrusted data, and the responder's language placeholder is filled.
  assert.match(built.classifier.calls[0][1].content, /^<ticket>/);
  assert.match(built.responder.calls[0][0].content, /customer's language \(en\)/);
});

test("confident spam is closed after the classifier", async () => {
  const { built, modelFor } = models({
    classifier: [[["submit_classification", { ...classification, category: "other", isSpam: true, confidence: 0.97 }]]],
  });
  const state = await buildTriageGraph({ modelFor }).invoke({ ticket: spam });
  assert.equal(state.status, "closed_spam");
  assert.equal(built.prioritizer.calls.length, 0);
  assert.equal(state.response, undefined);
});

test("low confidence goes to human review", async () => {
  const { modelFor } = models({
    classifier: [[["submit_classification", { ...classification, confidence: 0.4 }]]],
  });
  const state = await buildTriageGraph({ modelFor }).invoke({ ticket });
  assert.equal(state.status, "needs_human_review");
  assert.ok(state.response);
});

test("an invalid result is sent back to the model to fix", async () => {
  const { built, modelFor } = models({
    classifier: [[["submit_classification", { ...classification, category: "nonsense" }]], [["submit_classification", classification]]],
  });
  const state = await buildTriageGraph({ modelFor }).invoke({ ticket });
  assert.equal(state.classification.category, "technical");
  assert.match(built.classifier.calls[1].at(-1).content, /Invalid result/);
});

test("a failing agent stops the run and asks for a human", async () => {
  const { built, modelFor } = models({ router: [] }); // script exhausted → model throws
  const state = await buildTriageGraph({ modelFor }).invoke({ ticket });
  assert.equal(state.status, "needs_human_review");
  assert.match(state.errors[0], /^router: /);
  assert.equal(built.responder.calls.length, 0);
});
