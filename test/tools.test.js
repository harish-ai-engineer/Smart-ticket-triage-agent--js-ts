import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { BaseTool } from "../src/tools/base.js";
import { allTools } from "../src/tools/index.js";

const tools = Object.fromEntries(allTools().map((t) => [t.name, t]));
const call = async (name, args) => JSON.parse(await tools[name].invoke(args));

test("every agent's tools are registered once", () => {
  assert.deepEqual(Object.keys(tools).sort(), [
    "check_refund_eligibility", "check_service_status", "check_spam_signals", "detect_language", "extract_entities",
    "find_similar_tickets", "get_escalation_policy", "get_response_template", "get_sla_policy", "get_team_workload",
    "list_teams", "lookup_customer", "search_knowledge_base",
  ]);
});

test("classifier tools", async () => {
  assert.equal((await call("detect_language", { text: "Hola, tengo un problema con mi factura, gracias" })).language, "es");
  const entities = await call("extract_entities", { text: "Order ORD-12345 failed with 503, invoice INV-777 for $49.00" });
  assert.deepEqual(entities.orderIds, ["ORD-12345"]);
  assert.deepEqual(entities.errorCodes, ["503"]);
  assert.deepEqual(entities.amounts, ["$49.00"]);
  assert.equal((await call("check_spam_signals", { text: "SEO backlinks, guaranteed ranking, click here" })).flagged, true);
  assert.equal((await call("check_spam_signals", { text: "My API key stopped working" })).flagged, false);
});

test("prioritizer tools", async () => {
  assert.equal((await call("lookup_customer", { email: "OPS@bigretail.com" })).tier, "enterprise");
  assert.equal((await call("lookup_customer", { email: "nobody@x.com" })).found, false);
  assert.equal((await call("get_sla_policy", { tier: "pro", priority: "P2" })).slaHours, 8);
  assert.equal((await call("check_service_status", { product: "api" })).activeIncidents[0].id, "INC-2041");
  assert.equal((await call("check_service_status", { product: "dashboard" })).allOperational, true);
  assert.equal((await call("find_similar_tickets", { query: "api 503 errors" })).isSpike, true);
});

test("router tools", async () => {
  assert.deepEqual((await call("list_teams", { category: "security" })).teams.map((t) => t.id), ["security-response"]);
  assert.equal((await call("get_team_workload", { teamId: "platform-support" })).ticketsPerAgent, 8);
  assert.ok((await call("get_team_workload", { teamId: "nope" })).error);
  assert.equal((await call("get_escalation_policy", { priority: "P1" })).pageOnCall, true);
});

test("responder tools", async () => {
  assert.equal((await call("search_knowledge_base", { query: "refund my annual charge" })).results[0].id, "KB-101");
  const filled = await call("get_response_template", { template: "acknowledge", variables: { customer_name: "Jane", subject: "Hi", body: "Done." } });
  assert.match(filled.text, /Hi Jane,/);
  assert.match(filled.text, /Acme Cloud Support/);
  assert.deepEqual(filled.missingVariables, []);
  assert.equal((await call("check_refund_eligibility", { plan: "annual", daysSinceCharge: 12 })).eligible, true);
  assert.equal((await call("check_refund_eligibility", { plan: "monthly", daysSinceCharge: 12 })).eligible, false);
  assert.equal((await call("check_refund_eligibility", { plan: "annual", daysSinceCharge: 1, accountStatus: "past_due" })).eligible, false);
});

test("a tool error comes back as a result, not a throw", async () => {
  class Broken extends BaseTool {
    name = "broken";
    description = "always fails";
    schema = z.object({});
    async execute() {
      throw new Error("boom");
    }
  }
  assert.deepEqual(JSON.parse(await new Broken().invoke({})), { error: "broken failed: boom" });
});
