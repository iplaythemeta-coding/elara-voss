import { getIdentity } from "../../../cursor/identity";
import { chatLimiter } from "@/lib/elara/limit";
import { sanitizeFacts } from "@/lib/elara/memory";
import type { Fact } from "@/lib/elara/types";
import { respond } from "@/lib/elara/respond";

const headers = { "cache-control": "no-store" };

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim().slice(0, 80) || "unknown";
  return request.headers.get("x-real-ip")?.slice(0, 80) || "local";
}

function quiet(reply: string, status: number, facts: Fact[] = []) {
  return Response.json(
    { reply, facts, provider: "rehearsal", mode: "rehearsal" },
    { status, headers },
  );
}

export async function POST(request: Request) {
  if (!chatLimiter(clientKey(request))) {
    return quiet("You're talking rather quickly. Give me a second, then say it again.", 429);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 80_000) {
      return quiet("That was too much text for one line. Cut it down and send the scene.", 413);
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return quiet("I didn't catch that. Try the line again.", 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return quiet("I didn't catch that. Try the line again.", 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return Response.json(
      {
        reply: "I'm here. Say the line.",
        facts: sanitizeFacts(body.facts),
        provider: "rehearsal",
        mode: "rehearsal",
      },
      { status: 400, headers },
    );
  }
  if (message.length > 2000) {
    return Response.json(
      {
        reply: "Keep it to a scene, not a novel. The first two thousand characters will do.",
        facts: sanitizeFacts(body.facts),
        provider: "rehearsal",
        mode: "rehearsal",
      },
      { status: 400, headers },
    );
  }

  try {
    const identity = await getIdentity(request);
    const result = await respond({
      message,
      history: body.history,
      facts: body.facts,
      provider: body.provider,
      apiKey: body.apiKey,
      allowServerKey: identity.verified && identity.stage !== "preview",
    });
    return Response.json(result, { headers });
  } catch {
    return quiet("The line went quiet. Say that once more.", 500, sanitizeFacts(body.facts));
  }
}
