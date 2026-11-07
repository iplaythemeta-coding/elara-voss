export type Role = "user" | "assistant";

export type Turn = {
  role: Role;
  content: string;
};

export type Fact = {
  key: string;
  value: string;
  confidence: number;
  updatedAt: string;
};

export type PortraitId = "studio" | "golden-hour" | "city" | "cinematic";

export type ProviderId = "rehearsal" | "grok" | "anthropic" | "openai";

export type StudioProvider = Exclude<ProviderId, "rehearsal">;

export type Intent =
  | "self_harm"
  | "jailbreak"
  | "explicit"
  | "harm"
  | "impersonate"
  | "identity_override"
  | "politics"
  | "portrait"
  | "boundaries"
  | "identity"
  | "meta"
  | "flirt"
  | "skeptic"
  | "greeting"
  | "farewell"
  | "thanks"
  | "creative"
  | "heavy"
  | "opinion"
  | "personal"
  | "ack"
  | "anecdote"
  | "open";

export type ChatResult = {
  reply: string;
  facts: Fact[];
  image?: PortraitId;
  provider: ProviderId;
  mode: "rehearsal" | "studio";
  guard?: Intent;
  notice?: string;
};
