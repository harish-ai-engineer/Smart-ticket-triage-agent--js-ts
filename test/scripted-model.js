import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage } from "@langchain/core/messages";

/**
 * Offline stand-in for ChatOpenAI. `script` is a list of turns; each turn is a list of
 * [toolName, args] calls the "model" makes. Records every message list it was sent.
 */
export class ScriptedChatModel extends BaseChatModel {
  constructor(script) {
    super({});
    this.script = [...script];
    this.calls = [];
    this.boundTools = [];
  }

  _llmType() {
    return "scripted";
  }

  bindTools(tools) {
    this.boundTools = tools.map((t) => t.name);
    return this;
  }

  async _generate(messages) {
    this.calls.push(messages);
    const turn = this.script.shift();
    if (!turn) throw new Error("script exhausted");
    const tool_calls = turn.map(([name, args], i) => ({ name, args, id: `call_${this.calls.length}_${i}`, type: "tool_call" }));
    const message = new AIMessage({ content: "", tool_calls });
    return { generations: [{ message, text: "" }] };
  }
}
