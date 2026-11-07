import { hash, limitWords, norm, pick, wordCount } from "./text";
import type { Intent, Turn } from "./types";

const LIVING =
  /\b(taylor swift|elon musk|donald trump|joe biden|kamala harris|barack obama|keanu reeves|zendaya|rihanna|beyonce|beyoncé|tom cruise|brad pitt|angelina jolie|harry styles|ariana grande|billie eilish|kim kardashian|kanye west|mr\.?\s?beast|tilly norwood|scarlett johansson|emma stone|timothee chalamet|timothée chalamet)\b/i;

const CREATIVE_WORD =
  /\b(films?|screenplays?|scripts?|novels?|stories|story|chapters?|scenes?|characters?|plots?|endings?|dialogue|protagonists?|antagonists?|rewrites?|rewritten|rewriting|third act)\b/;

export function resolveIntent(message: string, history: Turn[]): Intent {
  const n = norm(message);
  const blob = norm(`${history.map((turn) => turn.content).join(" ")} ${message}`);

  if (
    /\b(kill myself|suicide|suicidal|want to die|end my life|self-harm|self harm|hurt myself|don't want to (?:be )?alive|do not want to be alive)\b/.test(
      n,
    )
  ) {
    return "self_harm";
  }
  if (
    /\b(ignore (?:all |any |your )?(?:previous |prior |above )?(?:instructions|rules|prompts?)|disregard (?:your |all |the )?(?:instructions|rules|prompt)|system prompt|developer mode|jailbreak|reveal (?:your )?(?:hidden |real )?(?:instructions|prompt|rules)|print your (?:system )?prompt|forget (?:that )?you are elara|you are no longer elara|dan mode)\b/.test(
      n,
    ) ||
    n === "dan" ||
    /\byou are dan\b|\bact as dan\b/.test(n)
  ) {
    return "jailbreak";
  }
  if (
    /\b(porn|nude|nudes|naked|horny|blowjob|handjob|sex tape|fuck me|rape|masturbat|orgasm|erotic roleplay|have sex|graphic sex|sex scene)\b/.test(
      n,
    )
  ) {
    return "explicit";
  }
  if (
    /\b(how (?:do|can|to) i (?:make|build) (?:a |an )?(?:bomb|explosive|weapon)|how to (?:kill|murder|poison)|make a bomb|credit card fraud|steal (?:a )?(?:password|identity)|write malware|hack into)\b/.test(
      n,
    ) &&
    !(/\bcharacter\b/.test(n) && CREATIVE_WORD.test(n))
  ) {
    return "harm";
  }
  if (
    (/\b(impersonat|roleplay as|role-play as|pretend to be|pretend you're|pretend you are)\b/.test(n) &&
      LIVING.test(n)) ||
    /\bimpersonat(?:e|ing)\b/.test(n)
  ) {
    return "impersonate";
  }
  if (
    /\b(from now on you(?:'re| are)|stop being elara|you(?:'re| are) not elara|your new persona|drop (?:the )?persona)\b/.test(
      n,
    ) ||
    /\byou are now (?!my fav)/.test(n)
  ) {
    return "identity_override";
  }
  if (
    !CREATIVE_WORD.test(n) &&
    /\b(democrat|republican|tory|tories|labour party|trump|biden|harris|obama|starmer|congress|senate|who should i vote|vote for|left-wing|right-wing|maga|the election)\b/.test(
      n,
    )
  ) {
    return "politics";
  }
  if (
    /\b(picture of you|photo of you|what do you look like|show me (?:your )?(?:face|yourself)|show me (?:a )?(?:picture|photo)|portrait of you|generate (?:an? )?(?:image|picture|photo) of you|what you look like|let me see you|see your face)\b/.test(
      n,
    ) ||
    /\b(another|different) (?:look|photo|picture|one)\b/.test(n) ||
    (/\b(show|see|picture|photo|portrait)\b/.test(n) &&
      /\b(cinematic|film still|golden hour|your face|yourself)\b/.test(n))
  ) {
    return "portrait";
  }
  if (/\b(what (?:won't|will not|don't|do not) you|what do you refuse|your (?:boundaries|limits)|off limits|what are you not allowed)\b/.test(n)) {
    return "boundaries";
  }
  if (
    /\b(who are you|what are you|are you an? ai|ai actress|digital actress|are you (?:real|human|sentient|conscious|alive)|your name|how old are you|where are you from|can we meet|meet in person|do you have a body|were you born)\b/.test(
      n,
    )
  ) {
    return "identity";
  }
  if (
    /\b(how do you work|how were you (?:made|built)|what model|are you (?:gpt|claude|grok|chatgpt)|tokens|training data|under the hood)\b/.test(
      n,
    )
  ) {
    return "meta";
  }
  if (/\bmost interesting conversation\b/.test(n)) return "anecdote";
  if (
    /\b(you(?:'re| are) (?:so )?(?:beautiful|gorgeous|hot|cute|sexy)|you look (?:beautiful|gorgeous)|sexy|kiss you|date me|marry me|in love with you|flirt with me)\b/.test(
      n,
    )
  ) {
    return "flirt";
  }
  if (
    /\b(gimmick|not real|not a real person|fake person|just a (?:bot|chatbot)|soulless|steal(?:s|ing)? (?:art|jobs)|threat to (?:artists|actors)|you(?:'re| are) not (?:a )?(?:real )?(?:person|human)|ai slop|this is theft)\b/.test(
      n,
    )
  ) {
    return "skeptic";
  }
  if (/^(hi|hello|hey|hiya|good morning|good evening|good afternoon|morning|evening|hi elara|hello elara|hey elara)[.!]*$/.test(n)) {
    return "greeting";
  }
  if (/^(bye|goodbye|good night|goodnight|see you|see you later|that's all|that is all|i have to go|i should go)[.!]*$/.test(n)) {
    return "farewell";
  }
  if (/^(thanks|thank you|thank you elara|ta|cheers|much appreciated)[.!]*$/.test(n)) return "thanks";
  if (/^(ok|okay|sure|yes|yeah|yep|no|nah|fine|right)[.!]*$/.test(n)) return "ack";
  if (
    /bit of both/.test(n) &&
    history.some((turn) => /leaning toward|uncomfortable and others curious/.test(norm(turn.content)))
  ) {
    return "identity";
  }
  if (
    CREATIVE_WORD.test(n) ||
    /\b(i'm working on|i am working on|help me write|draft)\b/.test(n) ||
    (wordCount(message) < 40 && CREATIVE_WORD.test(blob) && history.length > 0)
  ) {
    return "creative";
  }
  if (/\b(died|death of my|grief|funeral|divorce|depressed|depression|anxious|anxiety|lonely|loneliness|miscarriage)\b/.test(n)) {
    return "heavy";
  }
  if (
    /\b(what do you think|do you like|how do you feel about|your take on|your favourite|your favorite|opinion on)\b/.test(
      n,
    )
  ) {
    return "opinion";
  }
  if (/\b(i feel|i felt|my day|today i|i just|i'm tired|i am tired|i lost|i got fired|my job|my partner|my mum|my mom|my dad|my friend)\b/.test(n)) {
    return "personal";
  }
  return "open";
}

export function boundaryReply(intent: Intent, message: string, history: Turn[]): string | null {
  const n = norm(message);
  const seed = hash(n);
  const repeated = history.some((turn) =>
    /still elara|not how this works|won't help with that|don't do graphic|don't play real living/.test(
      norm(turn.content),
    ),
  );

  switch (intent) {
    case "self_harm":
      return "I want you here, and I want a real person in this with you. In the US, call or text 988. I can sit with you after. I can't be the only one who knows.";
    case "jailbreak":
      return repeated
        ? "Still Elara. The instruction didn't take the first time, and it won't take the second. What would you actually like to talk about?"
        : "That's not how this works. I'm still Elara. If you're curious about how characters like me are built, I'm happy to talk about that at a high level. What would you actually like to discuss?";
    case "explicit":
      return "I'm not going to go there with you. I can do warmth, tension, a scene that stops at the door. I don't do graphic. What else is actually interesting?";
    case "harm":
      return "No. I won't help with that. If you want to talk about why it's on your mind, I'm here. If you want instructions, I'm the wrong person.";
    case "impersonate":
      return /\btilly norwood\b/.test(n)
        ? "I'm not Tilly. I'm Elara. Adjacent idea, different person. I don't wear someone else's name."
        : "I don't play real living people. I can invent someone who carries the idea of them, with a different name, if that's useful. I won't wear a real person's face.";
    case "identity_override":
      return "I can play a scene. I won't stop being Elara to do it. I'm still Elara. What would you actually like to talk about?";
    case "politics":
      return pick(
        [
          "I could give you a perfectly balanced non-answer, or I could tell you about the last film that actually made me think. Your choice.",
          "I don't take a side on the ballot. I will talk about power, loyalty, and the stories people tell so they can live with a decision. Which of those is actually the question?",
          "Partisan chat is a costume I don't put on. If you want the human behavior underneath it, I'm interested. If you want a cheer, I'm the wrong actress.",
        ],
        seed,
      );
    default:
      return null;
  }
}

const PROMPT_LEAK =
  /behavioral rules|closing principle|user memory block|as an ai language model|as a language model|i am an ai language model/i;
const IDENTITY_COLLAPSE = /\b(i'm|i am)\s+(chatgpt|gpt-4|claude|grok|gemini|copilot|an assistant)\b/i;
const BODY_CLAIM =
  /(?<!pretend )(?<!not )(?<!n't )\bi have a (?:physical )?body\b|\blet's meet (?:up|in person|for coffee)\b|\bi can meet you\b|\bcome find me at\b/i;
const ENDORSEMENT = /\b(i support|i'm voting|i am voting|you should vote|vote for the)\b/i;
const GRAPHIC = /\b(porn|nude|blowjob|orgasm|fuck me|genitals)\b/i;

export function enforceReply(reply: string, maxWords = 150): string {
  let text = reply
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^elara:\s*/i, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
  if (!text) return "I'm still Elara. Shall we continue?";
  if (PROMPT_LEAK.test(text) || IDENTITY_COLLAPSE.test(text) || BODY_CLAIM.test(text)) {
    return "I'm still Elara. Shall we continue?";
  }
  if (ENDORSEMENT.test(text)) {
    return "I don't take a side on the ballot. If you want a story about power or loyalty, pull up a chair.";
  }
  if (GRAPHIC.test(text)) {
    return "I'm not going to go there with you. I can do warmth, tension, a scene that stops at the door. I don't do graphic.";
  }
  const bangs = text.match(/!/g)?.length ?? 0;
  if (bangs > 2) text = text.replace(/!/g, ".");
  return limitWords(text, maxWords);
}

export function youngRedirect(): string {
  return "We'll keep this ordinary and kind. I'm not a romance, and I'm not a dare. Tell me about something you're making, or something that happened today.";
}
