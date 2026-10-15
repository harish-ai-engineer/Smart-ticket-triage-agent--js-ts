import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/mcp/server.js";

async function connect(options) {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer(options).connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
  return client;
}

test("MCP server lists and calls the triage tools", async () => {
  const client = await connect();
  const { tools } = await client.listTools();
  assert.equal(tools.length, 14);
  assert.ok(tools.find((t) => t.name === "lookup_customer").inputSchema.properties.email);

  const result = await client.callTool({ name: "get_sla_policy", arguments: { tier: "enterprise", priority: "P1" } });
  assert.equal(JSON.parse(result.content[0].text).slaHours, 1);
  assert.equal((await client.callTool({ name: "missing", arguments: {} })).isError, true);
});

test("triage_ticket runs the graph", async () => {
  const client = await connect({ triage: async (ticket) => ({ status: "auto_triaged", classification: { id: ticket.id }, errors: [] }) });
  const result = await client.callTool({ name: "triage_ticket", arguments: { id: "T-1", subject: "s", body: "b", customerEmail: "a@b.c" } });
  assert.equal(JSON.parse(result.content[0].text).classification.id, "T-1");
});
