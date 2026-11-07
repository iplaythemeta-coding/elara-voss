import { norm } from "./text";
import type { Fact, Turn } from "./types";

export const FACT_KEYS = [
  "name",
  "project",
  "concern",
  "occupation",
  "city",
  "plot",
  "favorite",
  "_audience",
] as const;

const ALLOWED = new Set<string>(FACT_KEYS);

const NOT_NAMES = new Set([
  "elara",
  "ela",
  "stuck",
  "working",
  "not",
  "just",
  "really",
  "so",
  "still",
  "curious",
  "fine",
  "good",
  "sorry",
  "here",
  "back",
  "going",
  "trying",
  "done",
  "afraid",
  "tired",
  "happy",
  "sad",
  "interested",
  "confused",
  "sure",
  "ready",
  "british",
  "american",
  "writing",
  "reading",
  "making",
  "looking",
  "feeling",
  "thinking",
  "wondering",
  "hoping",
  "glad",
  "okay",
  "ok",
  "well",
  "now",
  "very",
  "quite",
  "also",
  "actually",
  "sorry",
  "scared",
  "angry",
  "lonely",
  "busy",
  "late",
  "early",
  "home",
  "lost",
  "done",
  "new",
  "old",
  "writer",
  "director",
  "actor",
  "student",
]);

export function factValue(facts: Fact[], key: string): string | undefined {
  return facts.find((fact) => fact.key === key)?.value;
}

export function isYoungFact(facts: Fact[]): boolean {
  return factValue(facts, "_audience") === "young";
}

const AGE_WORDS: Record<string, number> = {
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
};

const AGE_WORD = Object.keys(AGE_WORDS).join("|");

export function disclosesYoung(message: string): boolean {
  const n = norm(message);
  if (/\b(i'm|i am|im)\s+(a\s+)?(minor|kid|child|underage|teenager|teen)\b/.test(n)) {
    return true;
  }
  const aged = n.match(
    new RegExp(
      `\\b(?:i'm|i am|im)\\s+(\\d{1,2}|${AGE_WORD})\\s*(?:years?\\s*old|yrs?\\s*old)\\b`,
    ),
  );
  if (aged) return ageNumber(aged[1]) < 18;
  const bare = n.match(
    new RegExp(`\\b(?:i'm|i am|im)\\s+(\\d{1,2}|${AGE_WORD})\\b(?=\\s*(?:and|but|,|\\.|!|$))`),
  );
  if (bare) {
    const age = ageNumber(bare[1]);
    return age >= 5 && age < 18;
  }
  return false;
}

function ageNumber(value: string): number {
  if (/^\d+$/.test(value)) return Number(value);
  return AGE_WORDS[value] ?? 99;
}

/** Keep stored facts when a chat response failed or did not include a fact list. */
export function factsFromResponse(ok: boolean, facts: unknown): Fact[] | null {
  if (!ok || !Array.isArray(facts)) return null;
  return sanitizeFacts(facts);
}

export function sanitizeFacts(input: unknown): Fact[] {
  if (!Array.isArray(input)) return [];
  const cleaned: Fact[] = [];
  for (const item of input.slice(0, 16)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const key = typeof record.key === "string" ? record.key : "";
    const value = typeof record.value === "string" ? record.value.trim() : "";
    if (!ALLOWED.has(key) || value.length < 1 || value.length > 180) continue;
    const confidence =
      typeof record.confidence === "number" && record.confidence >= 0 && record.confidence <= 1
        ? record.confidence
        : 0.8;
    cleaned.push({
      key,
      value,
      confidence,
      updatedAt:
        typeof record.updatedAt === "string" && record.updatedAt.length < 40
          ? record.updatedAt
          : new Date(0).toISOString(),
    });
  }
  return cleaned;
}

export function sanitizeHistory(input: unknown): Turn[] {
  if (!Array.isArray(input)) return [];
  const turns: Turn[] = [];
  for (const item of input.slice(-12)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const role = record.role === "assistant" || record.role === "user" ? record.role : null;
    const content = typeof record.content === "string" ? record.content.trim().slice(0, 1500) : "";
    if (!role || !content) continue;
    turns.push({ role, content });
  }
  return turns;
}

export function extractFacts(message: string, existing: Fact[]): Fact[] {
  const map = new Map(existing.map((fact) => [fact.key, { ...fact }]));
  const n = norm(message);
  const put = (key: string, value: string) => {
    const clean = value.replace(/\s+/g, " ").trim().replace(/[.?!]+$/, "").slice(0, 180);
    if (clean.length < 2) return;
    map.set(key, {
      key,
      value: clean,
      confidence: 0.86,
      updatedAt: new Date().toISOString(),
    });
  };

  if (disclosesYoung(message)) put("_audience", "young");

  const named = message.match(
    /\b(?:my name is|call me|i am called|i'm called)\s+([A-Za-z][A-Za-z'’-]{1,30})/i,
  );
  if (named && !NOT_NAMES.has(named[1].toLowerCase())) {
    put("name", titleName(named[1]));
  } else {
    const implied = message.match(/(?:I|i)(?:'m| am)\s+([A-Z][a-z'’-]{1,30})\b/);
    if (
      implied &&
      !NOT_NAMES.has(implied[1].toLowerCase()) &&
      !/(?:I|i)(?:'m| am)\s+[A-Z][a-z'’-]+\s+(?:is|was)\b/.test(message)
    ) {
      put("name", titleName(implied[1]));
    }
  }

  const occupation = n.match(
    /\bi(?:'m| am)\s+an?\s+(writer|novelist|filmmaker|director|actor|actress|student|designer|playwright|poet|screenwriter|editor)\b/,
  );
  if (occupation) put("occupation", occupation[1]);

  const working = message.match(
    /\b(?:i(?:'m| am)\s+working on|i(?:'m| am)\s+writing|working on)\s+([^.?!]{6,160})/i,
  );
  if (working) put("project", working[1]);

  const city = message.match(/(?:I|i) live in\s+([A-Z][A-Za-z][A-Za-z .'-]{0,40})/);
  if (city) put("city", city[1].trim());

  if (/\b(stuck|struggl\w*|blocked|can't finish|cannot finish)\b/.test(n) && /\bending\b/.test(n)) {
    put("concern", "the ending");
  }

  if (/\bcompanion\b/.test(n) && /\b(delet\w*|evolv\w*)\b/.test(n)) {
    put("plot", "a choice between deleting the companion or letting it keep evolving");
  }

  const favorite = message.match(
    /\b(?:my favourite|my favorite)\s+([a-z][a-z\s]{2,24}?)\s+is\s+([^.?!\n]{2,60})/i,
  );
  if (favorite) put("favorite", `${favorite[1].trim()}: ${favorite[2].trim()}`);

  return [...map.values()].slice(0, 16);
}

function titleName(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function visibleFacts(facts: Fact[]): Fact[] {
  return facts.filter((fact) => !fact.key.startsWith("_"));
}
