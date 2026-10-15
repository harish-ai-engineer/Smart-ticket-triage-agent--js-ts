import { ChatOpenAI } from "@langchain/openai";
import { MODELS, TEMPERATURE } from "./config.js";

/** The GPT chat model for one agent role (classifier, prioritizer, router, responder). */
export function createChatModel(role) {
  const model = MODELS[role];
  if (!model) throw new Error(`No model configured for agent role "${role}"`);
  return new ChatOpenAI({ model, temperature: TEMPERATURE, maxRetries: 2, timeout: 60_000 });
}
