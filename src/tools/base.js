import { StructuredTool } from "@langchain/core/tools";

/**
 * Shared base for every triage tool. Subclasses implement `execute(input)` and return a
 * plain object; the base serialises it to JSON for the model and turns thrown errors into
 * an `{ error }` result so one failing lookup never kills an agent's run.
 */
export class BaseTool extends StructuredTool {
  async _call(input) {
    try {
      return JSON.stringify(await this.execute(input));
    } catch (error) {
      return JSON.stringify({ error: `${this.name} failed: ${error.message}` });
    }
  }

  // eslint-disable-next-line no-unused-vars
  async execute(input) {
    throw new Error(`${this.constructor.name} must implement execute()`);
  }
}

export function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}
