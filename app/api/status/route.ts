import { getIdentity } from "../../../cursor/identity";
import { configuredStudios } from "@/lib/elara/providers";

export async function GET(request: Request) {
  const identity = await getIdentity(request);
  const studio =
    identity.verified && identity.stage !== "preview"
      ? configuredStudios()
      : { grok: false, anthropic: false, openai: false };
  return Response.json(
    { rehearsal: true, studio },
    { headers: { "cache-control": "private, no-store" } },
  );
}
