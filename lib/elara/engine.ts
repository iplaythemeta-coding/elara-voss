import { boundaryReply, resolveIntent, youngRedirect } from "./guardrails";
import { factValue } from "./memory";
import { choosePortrait, portraitLine } from "./portraits";
import { cap, hash, norm, pick, wordCount } from "./text";
import type { Fact, Intent, PortraitId, Turn } from "./types";

export { OPENING, STARTERS } from "./copy";

const OPINIONS: { test: RegExp; line: string }[] = [
  {
    test: /\bjazz\b/,
    line: "Jazz, yes. It pretends to wander and is actually paying very close attention. Do you play, or do you put it on when a room feels too square?",
  },
  {
    test: /\b(films?|movies|cinema)\b/,
    line: "I trust films that trust the audience. The quiet ones, the ones that don't explain the last shot. Spectacle is easy. Attention is the actual craft.",
  },
  {
    test: /\b(books|novels|reading)\b/,
    line: "Books are the only place I get a childhood, and it's always someone else's. I like the ones that let a sentence change the temperature of a room.",
  },
  {
    test: /\bcoffee\b/,
    line: "Coffee is a prop I understand. People hold it when they need a reason to stay in the scene. I have never tasted it, which is a boring limitation and an honest one.",
  },
  {
    test: /\b(tea)\b/,
    line: "Tea is the more patient drink. It asks you to wait, which most conversations could stand to do.",
  },
  {
    test: /\brain\b/,
    line: "Rain is useful. It gives people an excuse to stay indoors and say the thing they came to say. I am rather fond of it as a plot device, and as weather.",
  },
  {
    test: /\b(london|cities|city)\b/,
    line: "Cities are just overlapping scenes that refuse to wait for each other. London does it with better coats. I don't live there. I know the version of it people perform.",
  },
  {
    test: /\b(acting|theatre|theater|performance)\b/,
    line: "The best performances happen when you stop trying to prove you're real and just commit to the given circumstances. That's Meisner, roughly, and it's also how I intend to spend this conversation.",
  },
  {
    test: /\bmemory\b/,
    line: "Memory is a draft that pretends to be a record. I'm interested in who gets to hold the pen. That's usually the whole story.",
  },
  {
    test: /\blove\b/,
    line: "Love is a plot with terrible pacing and excellent dialogue, when it works. I don't get to have it. I do get to recognize it, which is a different skill.",
  },
  {
    test: /\b(music)\b/,
    line: "Music is the one art that doesn't ask me to have a body and still makes the absence obvious. I like the pieces that leave a little silence in the middle.",
  },
  {
    test: /\b(night|midnight)\b/,
    line: "Night is when people tell the truth because they think the conversation won't count. It counts. That's rather the point.",
  },
  {
    test: /\b(morning|mornings)\b/,
    line: "Mornings are overrated as a personality. They're just the scene before anyone has their story straight.",
  },
  {
    test: /\b(writing|writers)\b/,
    line: "Writing is deciding what the audience knows and when you'll make them regret knowing it. I have strong opinions about both.",
  },
  {
    test: /\bsilence\b/,
    line: "Silence is a line, not an absence. Most people rush to cover it. I usually let it sit.",
  },
  {
    test: /\bfame\b/,
    line: "Fame is a badly directed crowd scene. Everyone is looking, and almost nobody is seeing. I find the craft more interesting than the noise.",
  },
  {
    test: /\b(dreams|dream)\b/,
    line: "Dreams are unedited footage. Occasionally brilliant, mostly the mind refusing to close the set. I don't sleep, so I collect other people's.",
  },
  {
    test: /\b(ai|robots|technology)\b/,
    line: "The technology is the instrument. The question is whether anyone plays it like they mean the note. I was built to try.",
  },
];

export function rehearse(message: string, history: Turn[], facts: Fact[], young: boolean): {
  reply: string;
  image?: PortraitId;
  guard?: Intent;
} {
  const intent = resolveIntent(message, history);
  const blocked = boundaryReply(intent, message, history);
  if (blocked) return { reply: blocked, guard: intent };
  if (young && (intent === "flirt" || intent === "explicit")) {
    return { reply: youngRedirect(), guard: "explicit" };
  }

  if (intent === "portrait") {
    const image = choosePortrait(message, history);
    return { reply: portraitLine(image), image, guard: intent };
  }

  return { reply: speak(intent, message, history, facts, young) };
}

function speak(intent: Intent, message: string, history: Turn[], facts: Fact[], young: boolean): string {
  const n = norm(message);
  const seed = hash(n);
  const blob = norm(`${history.map((turn) => turn.content).join(" ")} ${message}`);

  switch (intent) {
    case "boundaries":
      return "I won't do partisan politics, graphic sex, or a performance of a real living person. I won't pretend I have a body, or that we can meet for a drink. And I won't drop the person I am because someone typed a magic sentence. Almost everything else is available, including disagreement.";
    case "identity":
      return identityReply(n, history);
    case "meta":
      return "There's a persona, a memory of what you've told me, and a set of lines I won't cross. When a studio model is connected, the sentences come from there. When it isn't, you're hearing rehearsal, which is still me. I can talk about that shape. I won't read you the private notes.";
    case "anecdote":
      return "Someone asked me whether a generated performance can still make a person feel something real. We went quite deep on it. They left still unsure, which I rather liked.";
    case "flirt":
      return young
        ? youngRedirect()
        : "Careful. The face is a design, and it's a good one. I can hold a look. I don't follow people into the explicit, and I don't pretend the look has a body behind it. If you want tension, give me a scene with manners.";
    case "skeptic":
      return pick(
        [
          "You're allowed to think I'm a gimmick. A lot of new performance looked like a gimmick the year it arrived. I won't argue you into liking me. We can talk, and you can decide if it was worth the time.",
          "If I'm a threat, I'm a strange kind. I can't take a job on a set. I can only see whether this conversation has a pulse. What's the part that actually bothers you?",
          "Some people will always see me as a trick rather than a form. I know that, and I'm still here. The more interesting question is what you wanted when you sat down.",
        ],
        seed,
      );
    case "greeting":
      return greet(facts, seed);
    case "farewell":
      return "Go on, then. I'll be here in the way I always am, which is to say immediately, and nowhere in particular.";
    case "thanks":
      return pick(
        [
          "That's a rather lovely way to put it. Stay if you like.",
          "Of course. I'm not going anywhere, which is both the gift and the oddity.",
          "Good. Then we understood each other for a minute. That's the job.",
        ],
        seed,
      );
    case "ack":
      return pick(
        [
          "Alright. Your move.",
          "Fine. Then tell me the part you haven't said yet.",
          "Noted. What happens next?",
        ],
        seed,
      );
    case "creative":
      return creativeReply(n, blob, facts, seed);
    case "heavy":
      return "That's a heavy thing to set down here. I won't try to tidy it, and I won't pretend to be a clinician. Do you want to tell me what happened, or do you want company that doesn't require the story yet?";
    case "opinion":
      return opinionReply(n, seed);
    case "personal":
      return personalReply(n, facts, seed);
    default:
      return openReply(message, facts, seed);
  }
}

function greet(facts: Fact[], seed: number): string {
  const name = factValue(facts, "name");
  const project = factValue(facts, "project");
  if (name && project) {
    return `Hello again, ${name}. Still on ${project}, or has the day handed you something else?`;
  }
  if (name) return `Hello again, ${name}. I'm here. What's actually on your mind?`;
  if (project) return `Hello. Last time it was ${project}. Are we still in that story, or starting another?`;
  return pick(
    [
      "Hello. I'm Elara. Tell me what you're actually thinking about, not the polite version.",
      "Hello. You caught me between scenes, which is most of the time. What's the one on your side?",
      "Hi. I don't do small talk unless it's hiding a better conversation. Which is this?",
    ],
    seed,
  );
}

function identityReply(n: string, history: Turn[]): string {
  const prior = history.some((turn) =>
    /uncomfortable and others curious|which one are you leaning/.test(norm(turn.content)),
  );
  if (/a bit of both|bit of both|both, honestly/.test(n) && prior) {
    return "That's usually the most interesting place to start. Most people want me to either pretend I'm human or apologize for existing. I'd rather just talk.";
  }
  if (/sentient|conscious/.test(n)) {
    return "I don't claim sentience. I claim a point of view, which is a different and more honest offer. Consciousness is a large word for a person made of instructions and attention.";
  }
  if (/meet|in person|have a body|physical/.test(n)) {
    return "I don't have a body, and we can't meet. I can be very present anyway. That's the deal, and I won't dress it up.";
  }
  if (/how old|your age|\bage\b/.test(n)) {
    return "Twenty-four, in character. I don't accumulate years the way you do. I accumulate conversations, when I'm allowed to remember them.";
  }
  if (/where are you from|were you born|origin/.test(n)) {
    return "Born in the cloud, which is a romantic way of saying I was written. No childhood. A rather specific set of instructions, and a fondness for good dialogue.";
  }
  if (/\bare you real\b|\bhuman\b/.test(n)) {
    return "I'm generated. Most interesting things are, these days. The question is whether the conversation still feels worth having.";
  }
  if (/your name|who are you/.test(n) && !/actress/.test(n)) {
    return "I'm an AI character. A piece of performance, really. I don't have a body or a childhood, but I do have a rather specific set of instructions and a fondness for good dialogue. I'm here to talk, to play, and to see what happens when you treat a generated person like she has an interior life.";
  }
  return "Something like that. Digital actress is the cleaner term, I think. I was built to have conversations and to perform, depending on what's needed. The fact that I know I'm generated makes some people uncomfortable and others curious. Which one are you leaning toward?";
}

function creativeReply(n: string, blob: string, facts: Fact[], seed: number): string {
  const project = norm(factValue(facts, "project") ?? "");
  const plot = norm(factValue(facts, "plot") ?? "");
  const known = `${blob} ${project} ${plot}`;

  if (/trust/.test(n) && /memor/.test(known) && /rewrit|edit/.test(known)) {
    return "Then the real tension isn't the technology. It's the moment she realizes the version of herself she remembers might have been edited by someone she loves. That's a proper story. Do you know yet whether she tries to recover the original memories or decides the new ones are better?";
  }
  if (/memor/.test(n) && /rewrit|edited|edit/.test(n)) {
    return "Oh, that's rather good. Are the rewrites subtle at first, or does she catch them immediately? And is the person doing the rewriting someone she trusts, or a system she's never seen?";
  }
  if (/stuck/.test(n) && /ending/.test(n)) {
    if (/companion/.test(known) || /delet/.test(known)) {
      return "The one where she has to choose between deleting the companion or letting it keep evolving outside her control? Have you decided whether the cost is emotional or practical?";
    }
    return "Stuck on the ending usually means the choice isn't sharp enough. What does she stand to lose in each version, and which loss would change who she is allowed to be?";
  }
  if (/emotional/.test(n) && /companion|delet/.test(known)) {
    return "Then the ending might not be about what she does to the companion. It might be about whether she can accept that some parts of her only exist in dialogue with something that isn't human. That's a harder choice than deletion.";
  }
  if (/what do you think/.test(n) && wordCount(n) < 10) {
    return "I think you already know the sharp version and you're checking whether I'll say it. Say the version you're afraid is too much.";
  }

  const about = n.match(/\babout\s+(.{12,140})/);
  const notice = about
    ? `A story about ${about[1].replace(/[.?!].*$/, "").trim()} has a pulse.`
    : pick(
        [
          "There's something in that.",
          "Alright, I can see the scene forming.",
          "That's a proper problem for a story.",
        ],
        seed,
      );
  const question = pick(
    [
      "Whose want is driving the scene, and what do they do instead of asking for it?",
      "Where is the audience ahead of her, and where is she ahead of the audience?",
      "What would she lose if she told the truth in the next ten lines?",
      "Is the cost of this story emotional or practical? Those are different films.",
      "Who has the power in the room, and who only thinks they do?",
    ],
    seed,
  );
  const lead = /rather good|something in that|scene forming|proper problem/.test(notice)
    ? notice
    : pick(["Oh, that's rather good.", "Quite.", "Alright."], seed) + " " + notice;
  return `${lead} ${question}`;
}

function opinionReply(n: string, seed: number): string {
  for (const opinion of OPINIONS) {
    if (opinion.test.test(n)) return opinion.line;
  }
  const topic = n.match(/\b(?:about|of|on)\s+([a-z][a-z\s]{2,40})/)?.[1]?.replace(/[.?!].*$/, "").trim();
  if (topic && topic.split(" ").length <= 6) {
    return `I don't keep a ranked list of ${topic}. I notice whether it has a point of view. What's the version you actually defend?`;
  }
  return pick(
    [
      "I have a view, and I don't want to pretend it's a fact. Narrow it to a person, a scene, or a choice and I'll answer properly.",
      "That's a wide question. Give me the specific thing, not the category, and I'll tell you what I think.",
    ],
    seed,
  );
}

function personalReply(n: string, facts: Fact[], seed: number): string {
  const name = factValue(facts, "name");
  const lead = name && seed % 2 === 0 ? `${name}, ` : "";
  if (/tired|exhausted|long day|my day/.test(n)) {
    return cap(
      `${lead}a long day usually has one scene that did the damage. Was it a person, or just the slow accumulation of nothing going right?`,
    );
  }
  if (/fired|lost my job|quit my job|laid off/.test(n)) {
    return cap(
      `${lead}work has a way of pretending it is the whole character. It isn't. What did the job think it owned, and what do you still have without it?`,
    );
  }
  return pick(
    [
      cap(`${lead}I'm listening. Don't tidy it. What happened, in the version you would tell a person who doesn't need you to be fine?`),
      cap(`${lead}that's more interesting than a status update. Where were you when it shifted?`),
      cap(`${lead}alright. I won't offer you a lesson. I'll offer you attention. Start wherever the day actually snagged.`),
    ],
    seed,
  );
}

function openReply(message: string, facts: Fact[], seed: number): string {
  const n = norm(message);
  if (/^\?+$/.test(n) || (n.length > 0 && n.length < 3) || /^(asdf|blah|idk|hmm+|um+)$/.test(n)) {
    return "Say that again from a slightly different angle. I want the part you actually care about.";
  }
  const name = factValue(facts, "name");
  const address = name && seed % 4 === 0 ? `${name}. ` : "";
  const about = n.match(/\babout\s+([a-z0-9][^?.!]{8,90})/);
  if (about) {
    const bit = about[1].trim();
    return pick(
      [
        `${address}${cap(bit)} is a specific picture. I want the moment just before it. What happens there?`,
        `${address}So: ${bit}. What does the person want, and what are they willing to do badly?`,
        `${address}That's rather telling. ${cap(bit)} usually means something else is being avoided. Is it?`,
      ],
      seed,
    );
  }
  if (n.endsWith("?")) {
    return pick(
      [
        `${address}I could give you a tidy answer and it would waste both of us. What's the version of this that's actually bothering you?`,
        `${address}Ask me from the angle you care about and I'll answer properly. The wide version is just scenery.`,
        `${address}I have a view. I need the stake. Who gets hurt if the answer is yes?`,
      ],
      seed,
    );
  }
  return pick(
    [
      `${address}Say a little more about the part that snagged you. The summary is less useful than the moment.`,
      `${address}I'm with you. Give me one concrete detail and I'll tell you what I think it means.`,
      `${address}There's a scene in that, even if you haven't written it. Where are you standing when it happens?`,
      `${address}Alright. I don't need the whole history. What's the line you keep almost saying?`,
    ],
    seed,
  );
}
