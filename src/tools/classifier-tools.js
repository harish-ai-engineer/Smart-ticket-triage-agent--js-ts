import OpenAI from "openai";
import { z } from "zod";
import { MODERATION_MODEL } from "../config.js";
import { BaseTool } from "./base.js";

const LANGUAGE_HINTS = {
  es: ["hola", "gracias", "por", "favor", "factura", "cuenta", "problema"],
  fr: ["bonjour", "merci", "facture", "compte", "probleme", "svp"],
  de: ["hallo", "danke", "rechnung", "konto", "bitte", "problem", "nicht"],
  pt: ["ola", "obrigado", "fatura", "conta", "nao"],
};

export class DetectLanguageTool extends BaseTool {
  name = "detect_language";
  description = "Guess the ISO 639-1 language code of the ticket text. Returns { language, confidence }.";
  schema = z.object({ text: z.string().describe("Ticket subject and body") });

  async execute({ text }) {
    const words = new Set(text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\W+/));
    let best = { language: "en", hits: 0 };
    for (const [language, hints] of Object.entries(LANGUAGE_HINTS)) {
      const hits = hints.filter((hint) => words.has(hint)).length;
      if (hits > best.hits) best = { language, hits };
    }
    return { language: best.language, confidence: best.hits >= 2 ? 0.9 : best.hits === 1 ? 0.6 : 0.8 };
  }
}

export class ExtractEntitiesTool extends BaseTool {
  name = "extract_entities";
  description =
    "Pull structured identifiers out of ticket text: order ids, invoice numbers, HTTP status / error codes, emails, URLs and money amounts.";
  schema = z.object({ text: z.string() });

  async execute({ text }) {
    const all = (regex) => [...new Set(text.match(regex) ?? [])];
    return {
      orderIds: all(/\b(?:ORD|ORDER)[-#]?\d{3,}\b/gi),
      invoiceIds: all(/\bINV[-#]?\d{3,}\b/gi),
      errorCodes: all(/\b(?:[45]\d{2}|E[A-Z]?\d{3,})\b/g),
      emails: all(/[\w.+-]+@[\w-]+\.[\w.]+/g),
      urls: all(/https?:\/\/[^\s)]+/g),
      amounts: all(/[$€£]\s?\d+(?:[.,]\d{2})?/g),
    };
  }
}

const SPAM_PATTERNS = [/\bseo\b/i, /backlinks?/i, /crypto|bitcoin|forex/i, /click here/i, /guaranteed (?:traffic|ranking)/i, /\bcasino\b/i, /buy now/i];

export class CheckSpamSignalsTool extends BaseTool {
  name = "check_spam_signals";
  description =
    "Score how likely the ticket is spam or abuse rather than a real support request. Returns { spamScore 0-1, signals[], flagged }.";
  schema = z.object({ text: z.string() });

  constructor({ client } = {}) {
    super();
    this.client = client;
  }

  async execute({ text }) {
    const signals = SPAM_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
    const links = (text.match(/https?:\/\//g) ?? []).length;
    if (links >= 3) signals.push(`${links} links`);
    let spamScore = Math.min(1, signals.length * 0.3);

    // Optional: OpenAI moderation for abusive content (opt in, it is a paid call).
    let moderation = null;
    const client = this.client ?? (process.env.TRIAGE_MODERATION === "1" && process.env.OPENAI_API_KEY ? new OpenAI() : null);
    if (client) {
      const result = await client.moderations.create({ model: MODERATION_MODEL, input: text });
      moderation = { flagged: result.results[0].flagged };
      if (moderation.flagged) signals.push("openai moderation flagged");
    }
    return { spamScore, signals, flagged: spamScore >= 0.6, moderation };
  }
}

export function classifierTools(options = {}) {
  return [new DetectLanguageTool(), new ExtractEntitiesTool(), new CheckSpamSignalsTool(options)];
}
