import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { MAX_AGENT_STEPS } from "../config.js";

/**
 * A tool-calling agent: the model calls the agent's tools until it calls its submit tool,
 * whose arguments (validated by `outputSchema`) are the agent's result.
 */
export class Agent {
  constructor({ name, model, systemPrompt, tools, outputName, outputSchema, maxSteps = MAX_AGENT_STEPS }) {
    this.name = name;
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.outputSchema = outputSchema;
    this.outputTool = tool(async () => "submitted", {
      name: outputName,
      description: `Submit your final ${name} result. Call this exactly once, after using the other tools.`,
      schema: outputSchema,
    });
    this.maxSteps = maxSteps;
  }

  async run(input, systemPrompt = this.systemPrompt) {
    const toolsByName = new Map(this.tools.map((t) => [t.name, t]));
    const bound = this.model.bindTools([...this.tools, this.outputTool], { tool_choice: "required" });
    const messages = [new SystemMessage(systemPrompt), new HumanMessage(input)];
    const trace = [];

    for (let step = 0; step < this.maxSteps; step++) {
      const reply = await bound.invoke(messages);
      messages.push(reply);
      const calls = reply.tool_calls ?? [];
      if (calls.length === 0) {
        messages.push(new HumanMessage(`Call ${this.outputTool.name} with your result.`));
        continue;
      }

      for (const call of calls) {
        if (call.name === this.outputTool.name) {
          const parsed = this.outputSchema.safeParse(call.args);
          if (parsed.success) return { result: parsed.data, trace };
          messages.push(toolReply(call, `Invalid result: ${parsed.error.message}. Fix it and submit again.`));
          continue;
        }
        const target = toolsByName.get(call.name);
        const started = Date.now();
        const content = target
          ? await target.invoke(call.args).catch((error) => JSON.stringify({ error: error.message }))
          : JSON.stringify({ error: `Unknown tool ${call.name}` });
        trace.push({ agent: this.name, tool: call.name, args: call.args, ms: Date.now() - started });
        messages.push(toolReply(call, content));
      }
    }
    throw new Error(`${this.name} agent gave no valid result within ${this.maxSteps} steps`);
  }
}

function toolReply(call, content) {
  return new ToolMessage({ content: typeof content === "string" ? content : JSON.stringify(content), tool_call_id: call.id, name: call.name });
}

