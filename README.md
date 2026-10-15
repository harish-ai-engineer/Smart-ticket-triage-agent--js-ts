# Smart Ticket Triage Agent

A multi-agent support-ticket triage workflow built with **LangGraph.js** on **OpenAI GPT models**. Four agents each have their own tools, and every tool is also available through an **MCP server**.

```
START → classify ─┬─(confident spam)───────────────────────→ finalize → END
                  └→ prioritize → route → respond ─────────→ finalize
```

| Agent | Model | Tools | Output |
|---|---|---|---|
| Classifier | `gpt-4o-mini` | `detect_language`, `extract_entities`, `check_spam_signals` | category, product, language, sentiment, spam, confidence |
| Prioritizer | `gpt-4o-mini` | `lookup_customer`, `get_sla_policy`, `check_service_status`, `find_similar_tickets` | P1–P4, SLA hours, linked incident, spike |
| Router | `gpt-4o-mini` | `list_teams`, `get_team_workload`, `get_escalation_policy` | team, assignee, who to notify, human review flag |
| Responder | `gpt-4o` | `search_knowledge_base`, `get_response_template`, `check_refund_eligibility` | customer reply, KB citations, internal note |

Each agent calls its tools in a loop and finishes by calling its `submit_*` tool. That tool's arguments are checked against a zod schema, and an invalid result goes back to the model so it can fix it. If an agent fails, the ticket goes to `needs_human_review` and the run still finishes. Final statuses are `auto_triaged`, `needs_human_review` or `closed_spam`. Ticket text is wrapped in `<ticket>` tags and marked as untrusted data in every prompt.

## Run

```bash
npm install
export OPENAI_API_KEY=sk-...
npm start                              # triages examples/api-outage.json
node src/cli.js examples/refund.json
npm run mcp                            # MCP server over stdio (config in mcp.json)
npm test                               # offline tests: scripted fake model, no API key
```

Environment variables (see `.env.example`): `TRIAGE_MODEL_<ROLE>` overrides the model for one agent; `TRIAGE_MODERATION=1` adds OpenAI `omni-moderation-latest` to the spam check.

## Layout

```
mcp.json                      MCP client config
agents/*.agent.yaml           workflow and per-agent manifests
src/config.js                 model ids, thresholds
src/prompts.js                system prompts
src/graph.js                  LangGraph StateGraph
src/agents/                   Agent base class and the four agents
src/tools/                    BaseTool and each agent's tools
src/mcp/server.js             MCP server (13 tools + triage_ticket)
src/data/                     fixture customers, SLAs, incidents, teams, KB
test/                         node:test suites
```

## Detection signals present

| Category | Where | What |
|---|---|---|
| manifest | `mcp.json`, `agents/*.agent.yaml` | MCP server config, 1 workflow manifest and 4 agent manifests |
| ast_structural | `src/mcp/server.js`, `src/agents/*.js`, `src/tools/*.js` | `server.setRequestHandler(ListToolsRequestSchema / CallToolRequestSchema)` (the JS form of `@server.list_tools()` / `@server.call_tool()`); `class ClassifierAgent extends Agent`, etc.; `class BaseTool extends StructuredTool`, `class LookupCustomerTool extends BaseTool`, etc. |
| import_signature | `src/graph.js`, `src/llm.js`, `src/tools/classifier-tools.js`, `src/mcp/server.js` | `@langchain/langgraph`, `@langchain/openai`, `@langchain/core`, `openai`, `@modelcontextprotocol/sdk/server` |
| prompt_literal | `src/prompts.js` | `"You are the Ticket Classifier Agent for {company_name}…"`, `## Role` / `## Instructions` / `## Output` sections, `{placeholders}` |
| model_identifier | `src/config.js`, `agents/*.agent.yaml` | `gpt-4o`, `gpt-4o-mini`, `omni-moderation-latest` |
