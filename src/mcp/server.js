#!/usr/bin/env node
// MCP server exposing the triage tools, plus a `triage_ticket` tool that runs the whole graph.
// Transport: stdio (see mcp.json).
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { triageTicket } from "../graph.js";
import { allTools } from "../tools/index.js";

const TicketSchema = z.object({
  id: z.string().default(() => `T-${Date.now()}`),
  subject: z.string(),
  body: z.string(),
  customerEmail: z.string(),
  channel: z.enum(["email", "chat", "web", "phone"]).default("email"),
});

export function createServer({ tools = allTools(), triage = triageTicket } = {}) {
  const byName = new Map(tools.map((t) => [t.name, t]));
  const server = new Server({ name: "smart-ticket-triage", version: "0.1.0" }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...tools.map((t) => ({ name: t.name, description: t.description, inputSchema: z.toJSONSchema(t.schema) })),
      {
        name: "triage_ticket",
        description:
          "Run the full four-agent triage (classify, prioritise, route, draft reply) on a support ticket. Uses OpenAI GPT models; needs OPENAI_API_KEY.",
        inputSchema: z.toJSONSchema(TicketSchema, { io: "input" }),
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      if (name === "triage_ticket") {
        const state = await triage(TicketSchema.parse(args));
        const { status, classification, priority, routing, response, errors } = state;
        return text({ status, classification, priority, routing, response, errors });
      }
      const target = byName.get(name);
      if (!target) return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
      return { content: [{ type: "text", text: await target.invoke(args) }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: error.message }] };
    }
  });

  return server;
}

const text = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });

if (import.meta.url === `file://${process.argv[1]}`) {
  await createServer().connect(new StdioServerTransport());
}
