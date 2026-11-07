"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { OPENING, STARTERS } from "@/lib/elara/copy";
import { factsFromResponse, visibleFacts } from "@/lib/elara/memory";
import { PORTRAITS, portraitById } from "@/lib/elara/portraits";
import type { Fact, PortraitId, ProviderId } from "@/lib/elara/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: PortraitId;
  notice?: string;
};

type StudioStatus = {
  grok: boolean;
  anthropic: boolean;
  openai: boolean;
};

const STORAGE_KEY = "elara-voss-v1";
const KEY_STORAGE = "elara-voss-studio-key";

const openingMessage = (): ChatMessage => ({
  id: "opening",
  role: "assistant",
  content: OPENING,
});

type Saved = {
  messages: ChatMessage[];
  facts: Fact[];
  provider: ProviderId;
  stage: PortraitId;
};

const SERVER_SAVED: Saved = {
  messages: [openingMessage()],
  facts: [],
  provider: "rehearsal",
  stage: "studio",
};

const savedListeners = new Set<() => void>();
let savedSnapshot: Saved = SERVER_SAVED;
let savedLoaded = false;

function ensureSaved() {
  if (savedLoaded || typeof window === "undefined") return;
  savedLoaded = true;
  savedSnapshot = loadSaved() ?? SERVER_SAVED;
}

function subscribeSaved(listener: () => void) {
  savedListeners.add(listener);
  return () => savedListeners.delete(listener);
}

function getSaved() {
  ensureSaved();
  return savedSnapshot;
}

function writeSaved(recipe: (current: Saved) => Saved) {
  ensureSaved();
  savedSnapshot = recipe(savedSnapshot);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSnapshot));
  savedListeners.forEach((listener) => listener());
}

const keyListeners = new Set<() => void>();
let keySnapshot = "";
let keyLoaded = false;

function ensureKey() {
  if (keyLoaded || typeof window === "undefined") return;
  keyLoaded = true;
  keySnapshot = sessionStorage.getItem(KEY_STORAGE) ?? "";
}

function subscribeKey(listener: () => void) {
  keyListeners.add(listener);
  return () => keyListeners.delete(listener);
}

function getKey() {
  ensureKey();
  return keySnapshot;
}

function writeKey(value: string) {
  ensureKey();
  keySnapshot = value;
  if (value) sessionStorage.setItem(KEY_STORAGE, value);
  else sessionStorage.removeItem(KEY_STORAGE);
  keyListeners.forEach((listener) => listener());
}

const FACT_LABELS: Record<string, string> = {
  name: "Name",
  project: "Working on",
  concern: "Stuck on",
  occupation: "Work",
  city: "Lives in",
  plot: "The choice",
  favorite: "Favourite",
};

const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: "rehearsal", label: "Rehearsal" },
  { id: "grok", label: "Grok" },
  { id: "anthropic", label: "Claude" },
  { id: "openai", label: "GPT-4o" },
];

function loadSaved(): {
  messages: ChatMessage[];
  facts: Fact[];
  provider: ProviderId;
  stage: PortraitId;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      messages?: ChatMessage[];
      facts?: Fact[];
      provider?: ProviderId;
      stage?: PortraitId;
    };
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) return null;
    return {
      messages: parsed.messages.slice(-40),
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      provider: parsed.provider ?? "rehearsal",
      stage: parsed.stage ?? "studio",
    };
  } catch {
    return null;
  }
}

export function ChatScreen() {
  const saved = useSyncExternalStore(subscribeSaved, getSaved, () => SERVER_SAVED);
  const { messages, facts, provider, stage } = saved;
  const apiKey = useSyncExternalStore(subscribeKey, getKey, () => "");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [studio, setStudio] = useState<StudioStatus>({
    grok: false,
    anthropic: false,
    openai: false,
  });
  const [failed, setFailed] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  function setMessages(value: ChatMessage[] | ((current: ChatMessage[]) => ChatMessage[])) {
    writeSaved((current) => ({
      ...current,
      messages: typeof value === "function" ? value(current.messages) : value,
    }));
  }

  function setFacts(value: Fact[]) {
    writeSaved((current) => ({ ...current, facts: value }));
  }

  function setProvider(value: ProviderId) {
    writeSaved((current) => ({ ...current, provider: value }));
  }

  function setStage(value: PortraitId) {
    writeSaved((current) => ({ ...current, stage: value }));
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/status", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { studio?: StudioStatus } | null) => {
        if (data?.studio) setStudio(data.studio);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, pending]);

  const remembered = visibleFacts(facts);
  const portrait = portraitById(stage);
  const showStarters = messages.every((message) => message.role === "assistant") && !pending;
  const serverReady =
    (provider === "grok" && studio.grok) ||
    (provider === "anthropic" && studio.anthropic) ||
    (provider === "openai" && studio.openai);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    if (message.length > 2000) {
      setDraft(message.slice(0, 2000));
      return;
    }
    setFailed(false);
    setDraft("");
    const history = messages.slice(-12).map((item) => ({
      role: item.role,
      content: item.content,
    }));
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };
    setMessages((current) => [...current, userMessage]);
    setPending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          facts,
          provider,
          apiKey: provider === "rehearsal" ? undefined : apiKey || undefined,
        }),
      });
      const data = (await response.json()) as {
        reply?: string;
        facts?: Fact[];
        image?: PortraitId;
        notice?: string;
      };
      const reply =
        data.reply ||
        (response.status === 429
          ? "You're talking rather quickly. Give me a second, then say it again."
          : "The line went quiet. Say that once more.");
      if (data.image) setStage(data.image);
      const nextFacts = factsFromResponse(response.ok, data.facts);
      if (nextFacts) setFacts(nextFacts);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          image: data.image,
          notice: data.notice,
        },
      ]);
      if (!response.ok && response.status >= 500) setFailed(true);
    } catch {
      setFailed(true);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "The line went quiet. That wasn't you. Say it once more.",
        },
      ]);
    } finally {
      setPending(false);
      field.current?.focus();
    }
  }

  function clearConversation() {
    setMessages([openingMessage()]);
    setFacts([]);
    setConfirmClear(false);
    setFailed(false);
    setDossierOpen(false);
  }

  function exportConversation() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            character: "Elara Voss",
            messages,
            facts: remembered,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "elara-voss-conversation.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid h-dvh min-h-0 md:grid-cols-[minmax(280px,400px)_1fr]">
      <aside className="hidden min-h-0 flex-col border-r border-border bg-[#181410] md:flex">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <p className="text-[0.68rem] tracking-[0.28em] text-gold uppercase">Digital actress</p>
          <h1 className="mt-1 font-serif text-4xl leading-none text-foreground">Elara Voss</h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
            Born in the cloud. Keeps a face. Refuses a body. She would rather be interesting than convincing.
          </p>
          <div className="relative mt-5 h-[min(52dvh,520px)] overflow-hidden bg-black">
            <Image
              src={portrait.src}
              alt={`Elara Voss, ${portrait.label} portrait`}
              fill
              priority
              sizes="400px"
              className="object-cover object-[center_15%]"
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-mist">{portrait.note}</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {PORTRAITS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStage(item.id)}
                aria-pressed={stage === item.id}
                aria-label={`${item.label} portrait`}
                className={`relative aspect-[3/4] overflow-hidden border ${
                  stage === item.id ? "border-gold" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image src={item.src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
          <div className="mt-6">
            <p className="text-[0.68rem] tracking-[0.22em] text-gold uppercase">She remembers</p>
            {remembered.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Nothing yet. A name, a city, or a story, and she will keep it in this browser.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {remembered.slice(0, 4).map((fact) => (
                  <li key={fact.key} className="text-sm leading-5">
                    <span className="text-mist">{FACT_LABELS[fact.key] ?? fact.key}. </span>
                    <span>{fact.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="border-t border-border px-6 py-4">
          <Button variant="outline" className="w-full" onClick={() => setDossierOpen(true)}>
            Open the dossier
          </Button>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
          <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-black">
            <Image
              src={portrait.src}
              alt=""
              fill
              sizes="44px"
              className="object-cover object-[center_15%]"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-serif text-xl leading-none">Elara Voss</p>
            <p className="mt-1 text-[0.68rem] tracking-[0.2em] text-gold uppercase">Digital actress</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setDossierOpen(true)}>
            Dossier
          </Button>
        </header>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-10" aria-live="polite">
          <div className="mx-auto flex max-w-2xl flex-col gap-8">
            <p className="hidden text-[0.68rem] tracking-[0.28em] text-mist uppercase md:block">
              A conversation
            </p>
            {messages.map((message) => (
              <article key={message.id} className={message.role === "user" ? "ml-auto max-w-[90%]" : "max-w-[46rem]"}>
                <p
                  className={`text-[0.68rem] tracking-[0.22em] uppercase ${
                    message.role === "assistant" ? "text-gold" : "text-mist"
                  }`}
                >
                  {message.role === "assistant" ? "Elara" : "You"}
                </p>
                <p
                  className={
                    message.role === "assistant"
                      ? "mt-2 font-serif text-[1.12rem] leading-8 text-foreground"
                      : "mt-2 rounded-md bg-muted px-4 py-3 text-[0.98rem] leading-7 text-foreground"
                  }
                >
                  {message.content}
                </p>
                {message.image ? (
                  <div className="relative mt-4 aspect-[3/4] w-full max-w-[240px] overflow-hidden bg-black">
                    <Image
                      src={portraitById(message.image).src}
                      alt={`Elara Voss, ${portraitById(message.image).label}`}
                      fill
                      sizes="240px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                {message.notice ? <p className="mt-2 text-xs text-mist">{message.notice}</p> : null}
              </article>
            ))}
            {pending ? (
              <p className="font-serif text-lg text-mist">She considers the line.</p>
            ) : null}
            {showStarters ? (
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <Button
                    key={starter.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void send(starter.message)}
                  >
                    {starter.label}
                  </Button>
                ))}
              </div>
            ) : null}
            {failed ? (
              <p className="text-sm text-mist">The last line did not go through. You can send it again.</p>
            ) : null}
          </div>
        </div>

        <form
          className="border-t border-border px-4 py-4 md:px-10"
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            <label htmlFor="line" className="sr-only">
              Your line to Elara
            </label>
            <Textarea
              ref={field}
              id="line"
              value={draft}
              placeholder="Speak, or write the scene..."
              rows={2}
              maxLength={2000}
              disabled={pending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-mist">Enter sends. Shift+Enter breaks the line.</p>
              <Button type="submit" disabled={pending || draft.trim().length === 0}>
                Send
              </Button>
            </div>
          </div>
        </form>
      </section>

      <Dialog
        open={dossierOpen}
        onOpenChange={(open) => {
          setDossierOpen(open);
          if (!open) setConfirmClear(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dossier</DialogTitle>
            <DialogDescription>
              Elara Voss is an original digital actress. She knows she is generated, and she will not pretend otherwise.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 text-sm leading-6">
            <p>
              “I&apos;m an AI character. A piece of performance, really. I don&apos;t have a body or a childhood, but I do have a rather specific set of instructions and a fondness for good dialogue.”
            </p>
            <p className="text-muted-foreground">
              She won&apos;t do partisan politics, graphic sex, instructions for harm, or an impression of a real living person. She won&apos;t claim she can meet you. If you are under 18, she drops the flirtation entirely.
            </p>
            <Separator />
            <div>
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[0.68rem] tracking-[0.2em] text-gold uppercase">The line</p>
                <Badge>{provider === "rehearsal" ? "Rehearsal" : serverReady || apiKey ? "Studio" : "Needs a key"}</Badge>
              </div>
              <p className="mb-3 text-muted-foreground">
                Rehearsal is Elara without a model provider. Your line is sent to this app so she can answer, and it is not passed on to Grok, Claude, or GPT-4o. Studio, if you connect one, sends this conversation to one of those.
              </p>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={provider === item.id ? "default" : "outline"}
                    onClick={() => setProvider(item.id)}
                  >
                    {item.label}
                    {item.id !== "rehearsal" && studio[item.id] ? " · ready" : ""}
                  </Button>
                ))}
              </div>
              {provider !== "rehearsal" ? (
                <div className="mt-3">
                  <label htmlFor="studio-key" className="mb-1 block text-mist">
                    Provider key, kept in this tab only
                  </label>
                  <Input
                    id="studio-key"
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    placeholder={serverReady ? "A server key is already available" : "Paste a key to use studio"}
                    onChange={(event) => writeKey(event.target.value.trim())}
                  />
                  <p className="mt-2 text-xs text-mist">
                    The key is sent with your line and is not written to the server&apos;s memory. Leave it blank to use a key configured for this app, if one is connected.
                  </p>
                </div>
              ) : null}
            </div>
            <Separator />
            <div>
              <p className="text-[0.68rem] tracking-[0.2em] text-gold uppercase">In this browser</p>
              {remembered.length === 0 ? (
                <p className="mt-2 text-muted-foreground">
                  She hasn&apos;t kept a note. Tell her your name or what you&apos;re making.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {remembered.map((fact) => (
                    <li key={fact.key}>
                      <span className="text-mist">{FACT_LABELS[fact.key] ?? fact.key}. </span>
                      {fact.value}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="outline" onClick={exportConversation}>
                Export conversation
              </Button>
              {confirmClear ? (
                <>
                  <Button type="button" variant="default" onClick={clearConversation}>
                    Yes, clear it
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirmClear(false)}>
                    Keep it
                  </Button>
                </>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setConfirmClear(true)}>
                  Clear this conversation
                </Button>
              )}
            </div>
            {confirmClear ? (
              <p className="text-mist">
                Clearing removes the transcript and the notes she keeps in this browser.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
