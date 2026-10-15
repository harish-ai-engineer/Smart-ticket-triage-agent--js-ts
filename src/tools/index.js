import { classifierTools } from "./classifier-tools.js";
import { prioritizerTools } from "./prioritizer-tools.js";
import { responderTools } from "./responder-tools.js";
import { routerTools } from "./router-tools.js";

export function allTools(options = {}) {
  const tools = [...classifierTools(options), ...prioritizerTools(), ...routerTools(), ...responderTools()];
  // lookup_customer etc. are unique today; keep the first if two agents ever share one.
  return [...new Map(tools.map((t) => [t.name, t])).values()];
}
