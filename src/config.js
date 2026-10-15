// Model configuration (signal: model_identifier). Every agent runs on an OpenAI GPT model;
// each can be overridden with an environment variable.

export const MODELS = {
  classifier: process.env.TRIAGE_MODEL_CLASSIFIER ?? "gpt-4o-mini",
  prioritizer: process.env.TRIAGE_MODEL_PRIORITIZER ?? "gpt-4o-mini",
  router: process.env.TRIAGE_MODEL_ROUTER ?? "gpt-4o-mini",
  responder: process.env.TRIAGE_MODEL_RESPONDER ?? "gpt-4o",
};

export const MODERATION_MODEL = "omni-moderation-latest";

export const TEMPERATURE = 0;
export const MAX_AGENT_STEPS = 6;
export const COMPANY_NAME = process.env.TRIAGE_COMPANY_NAME ?? "Acme Cloud";

// Below this classifier confidence a ticket always goes to a human.
export const MIN_AUTO_CONFIDENCE = 0.6;
// At or above this confidence a spam verdict closes the ticket without further work.
export const SPAM_CLOSE_CONFIDENCE = 0.8;

export const CATEGORIES = ["billing", "technical", "account", "feature_request", "bug", "security", "other"];
export const PRIORITIES = ["P1", "P2", "P3", "P4"];
export const SENTIMENTS = ["angry", "negative", "neutral", "positive"];
