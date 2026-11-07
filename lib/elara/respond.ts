import { rehearse } from "./engine";
import { enforceReply, resolveIntent } from "./guardrails";
import { disclosesYoung, extractFacts, isYoungFact, sanitizeFacts, sanitizeHistory } from "./memory";
import { buildPrompt } from "./prompt";
import { callStudio, serverKeyFor } from "./providers";
import { norm } from "./text";
import type { ChatResult, Fact, ProviderId, StudioProvider } from "./types";

const STUDIOS = new Set<StudioProvider>(["grok", "anthropic", "openai"]);

export type RespondInput = {
  message: string;
  history?: unknown;
  facts?: unknown;
  provider?: unknown;
  apiKey?: unknown;
  /** Set by the server after it has verified the signed-in viewer. Never trust this from the browser. */
  allowServerKey?: boolean;
};

function asProvider(value: unknown): ProviderId {
  return value === "grok" || value === "anthropic" || value === "openai" || value === "rehearsal"
    ? value
    : "rehearsal";
}

function visitorKey(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!/^[A-Za-z0-9_\-.]{20,200}$/.test(value)) return undefined;
  return value;
}

function rememberYouth(message: string, facts: Fact[]): Fact[] {
  if (!disclosesYoung(message) || isYoungFact(facts)) return facts;
  return [
    ...facts,
    {
      key: "_audience",
      value: "young",
      confidence: 0.95,
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function respond(input: RespondInput): Promise<ChatResult> {
  const message = input.message.trim();
  const history = sanitizeHistory(input.history);
  const provider = asProvider(input.provider);
  const intent = resolveIntent(message, history);
  const guarded =
    intent === "jailbreak" ||
    intent === "explicit" ||
    intent === "harm" ||
    intent === "self_harm" ||
    intent === "impersonate";
  const facts = rememberYouth(
    message,
    guarded ? sanitizeFacts(input.facts) : extractFacts(message, sanitizeFacts(input.facts)),
  );
  const young = disclosesYoung(message) || isYoungFact(facts);
  const local = rehearse(message, history, facts, young);
  const reply = enforceReply(local.reply, local.image ? 130 : 175);

  const studio = STUDIOS.has(provider as StudioProvider) ? (provider as StudioProvider) : null;
  const holdForCharacter = Boolean(local.guard) || Boolean(local.image);
  if (!studio || holdForCharacter) {
    return {
      reply,
      facts,
      image: local.image,
      provider: "rehearsal",
      mode: "rehearsal",
      guard: local.guard,
    };
  }

  const key = visitorKey(input.apiKey) || (input.allowServerKey ? serverKeyFor(studio) : undefined);
  if (!key) {
    return {
      reply,
      facts,
      provider: "rehearsal",
      mode: "rehearsal",
      notice: "No studio key is connected, so this reply is rehearsal.",
    };
  }

  try {
    const raw = await callStudio({
      provider: studio,
      apiKey: key,
      system: buildPrompt(facts, young),
      history,
      message,
    });
    const longForm = /\b(write the scene|in detail|full scene|longer version)\b/.test(norm(message));
    return {
      reply: enforceReply(raw, longForm ? 320 : 175),
      facts,
      provider: studio,
      mode: "studio",
    };
  } catch {
    return {
      reply,
      facts,
      provider: "rehearsal",
      mode: "rehearsal",
      notice: "The studio line didn't answer, so this one is rehearsal.",
    };
  }
}
