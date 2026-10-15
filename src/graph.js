import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ClassifierAgent } from "./agents/classifier.js";
import { PrioritizerAgent } from "./agents/prioritizer.js";
import { ResponderAgent } from "./agents/responder.js";
import { RouterAgent } from "./agents/router.js";
import { MIN_AUTO_CONFIDENCE, SPAM_CLOSE_CONFIDENCE } from "./config.js";
import { createChatModel } from "./llm.js";

const append = { reducer: (left, right) => left.concat(right), default: () => [] };

export const TriageState = Annotation.Root({
  ticket: Annotation(),
  classification: Annotation(),
  priority: Annotation(),
  routing: Annotation(),
  response: Annotation(),
  status: Annotation(),
  errors: Annotation(append),
  trace: Annotation(append),
});

/**
 * START → classify ─┬─(spam)──────────────────────────────→ finalize → END
 *                   └→ prioritize → route → respond ───────→ finalize
 * A failing agent records its error and skips straight to finalize, which sends the
 * ticket to human review instead of failing the run.
 */
export function buildTriageGraph({ modelFor = createChatModel, toolOptions, checkpointer } = {}) {
  const classifier = new ClassifierAgent({ model: modelFor("classifier"), toolOptions });
  const prioritizer = new PrioritizerAgent({ model: modelFor("prioritizer") });
  const router = new RouterAgent({ model: modelFor("router") });
  const responder = new ResponderAgent({ model: modelFor("responder") });

  const node = (agentName, key, work) => async (state) => {
    try {
      const { result, trace } = await work(state);
      return { [key]: result, trace };
    } catch (error) {
      return { errors: [`${agentName}: ${error.message}`] };
    }
  };

  const afterAgent = (next) => (state) => (state.errors.length ? "finalize" : next);

  return new StateGraph(TriageState)
    .addNode("classify", node("classifier", "classification", (s) => classifier.classify(s.ticket)))
    .addNode("prioritize", node("prioritizer", "priority", (s) => prioritizer.prioritize(s.ticket, s.classification)))
    .addNode("route", node("router", "routing", (s) => router.route(s.ticket, s.classification, s.priority)))
    .addNode(
      "respond",
      node("responder", "response", (s) =>
        responder.respond(s.ticket, { classification: s.classification, priority: s.priority, routing: s.routing }),
      ),
    )
    .addNode("finalize", finalize)
    .addEdge(START, "classify")
    .addConditionalEdges("classify", (state) => {
      if (state.errors.length) return "finalize";
      const c = state.classification;
      return c.isSpam && c.confidence >= SPAM_CLOSE_CONFIDENCE ? "finalize" : "prioritize";
    }, ["prioritize", "finalize"])
    .addConditionalEdges("prioritize", afterAgent("route"), ["route", "finalize"])
    .addConditionalEdges("route", afterAgent("respond"), ["respond", "finalize"])
    .addEdge("respond", "finalize")
    .addEdge("finalize", END)
    .compile({ checkpointer });
}

export function finalize(state) {
  const c = state.classification;
  if (!state.errors.length && c?.isSpam && c.confidence >= SPAM_CLOSE_CONFIDENCE) return { status: "closed_spam" };
  const needsHuman =
    state.errors.length > 0 ||
    !state.response ||
    state.routing?.needsHumanReview ||
    c?.confidence < MIN_AUTO_CONFIDENCE ||
    c?.category === "security";
  return { status: needsHuman ? "needs_human_review" : "auto_triaged" };
}

export async function triageTicket(ticket, options) {
  return buildTriageGraph(options).invoke({ ticket });
}
