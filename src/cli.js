#!/usr/bin/env node
// Usage: node src/cli.js [examples/ticket.json]   (default: examples/api-outage.json)
import { readFile } from "node:fs/promises";
import { triageTicket } from "./graph.js";

if (!process.env.OPENAI_API_KEY) {
  console.error("Set OPENAI_API_KEY first (the agents run on OpenAI GPT models).");
  process.exit(1);
}

const file = process.argv[2] ?? new URL("../examples/api-outage.json", import.meta.url);
const ticket = JSON.parse(await readFile(file, "utf8"));
const state = await triageTicket(ticket);

const { status, classification, priority, routing, response, errors, trace } = state;
console.log(JSON.stringify({ status, classification, priority, routing, response, errors }, null, 2));
console.error(`\n${trace.length} tool calls: ${trace.map((t) => `${t.agent}.${t.tool}`).join(", ")}`);
