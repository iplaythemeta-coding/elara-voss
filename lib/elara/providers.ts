import type { StudioProvider, Turn } from "./types";

const MODELS: Record<StudioProvider, { url: string; model: string; style: "openai" | "anthropic" }> = {
  grok: {
    url: "https://api.x.ai/v1/chat/completions",
    model: process.env.ELARA_GROK_MODEL || "grok-4",
    style: "openai",
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    model: process.env.ELARA_OPENAI_MODEL || "gpt-4o",
    style: "openai",
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    model: process.env.ELARA_ANTHROPIC_MODEL || "claude-sonnet-4-5",
    style: "anthropic",
  },
};

export function serverKeyFor(provider: StudioProvider): string | undefined {
  const value =
    provider === "grok"
      ? process.env.XAI_API_KEY
      : provider === "openai"
        ? process.env.OPENAI_API_KEY
        : process.env.ANTHROPIC_API_KEY;
  if (!value || value.length < 20) return undefined;
  return value;
}

export function configuredStudios(): Record<StudioProvider, boolean> {
  return {
    grok: Boolean(serverKeyFor("grok")),
    openai: Boolean(serverKeyFor("openai")),
    anthropic: Boolean(serverKeyFor("anthropic")),
  };
}

export async function callStudio(args: {
  provider: StudioProvider;
  apiKey: string;
  system: string;
  history: Turn[];
  message: string;
}): Promise<string> {
  const spec = MODELS[args.provider];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response =
      spec.style === "anthropic"
        ? await fetch(spec.url, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "content-type": "application/json",
              "x-api-key": args.apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: spec.model,
              max_tokens: 420,
              temperature: 0.7,
              system: args.system,
              messages: [...args.history, { role: "user", content: args.message }],
            }),
          })
        : await fetch(spec.url, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${args.apiKey}`,
            },
            body: JSON.stringify({
              model: spec.model,
              max_tokens: 420,
              temperature: 0.7,
              messages: [
                { role: "system", content: args.system },
                ...args.history,
                { role: "user", content: args.message },
              ],
            }),
          });

    if (!response.ok) {
      throw new Error(`studio_${response.status}`);
    }
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      content?: { type?: string; text?: string }[];
    };
    const text =
      spec.style === "anthropic"
        ? data.content?.find((block) => block.type === "text")?.text
        : data.choices?.[0]?.message?.content;
    if (!text?.trim()) throw new Error("studio_empty");
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}
