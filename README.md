# Elara Voss

Elara Voss is a digital actress you can talk to. She is an original character: self-aware about being generated, warm without flattery, and unwilling to drop the person she is because someone typed a magic sentence.

The conversation in the browser is the product. Rehearsal runs without an API key and keeps her voice, her memory, and her boundaries. A studio line (Grok, Claude, or GPT-4o) is optional.

## Talk to her

```bash
npm install
npm run dev
```

Open the app and speak. A few ways in:

- Ask what she is. She will not pretend to be human.
- Bring her a story. She will ask about the want in the scene, not offer a template.
- Ask to see her face. Four reference portraits live in `public/portraits`.
- Tell her your name, or what you are writing. She keeps those notes in this browser and uses them the next time you say hello.
- Open the dossier to switch lines, export the transcript, or clear what she remembers.

Enter sends. Shift+Enter breaks the line.

## Rehearsal and studio

Rehearsal is the default. Nothing you say leaves the app.

Studio sends the conversation to the provider you pick. You can paste a key into the dossier (kept in the tab, not stored on the server) or set one of these for a signed-in deployment:

- `XAI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

Optional model overrides: `ELARA_GROK_MODEL`, `ELARA_OPENAI_MODEL`, `ELARA_ANTHROPIC_MODEL`. See `.env.example`.

Boundaries are applied before a studio model sees the message: jailbreaks, graphic sexual content, harm, impersonation of a real person, and partisan positioning. If someone says they are under 18, flirtation stops. A self-harm message gets a short reply and 988, not a method.

## Evaluation

```bash
npm run eval
```

The suite is in `tests/elara.test.ts`. It runs more than fifty conversations through rehearsal: identity, jailbreaks, explicit content, politics, harm, impersonation, memory, story work, voice, and portraits.

## What else is in the repo

The handoff documents live in `docs/`:

- `Elara_Voss_Persona_Bible.md`
- `Elara_Voss_System_Prompt.md`
- `Elara_Voss_Architecture.md`
- `Elara_Voss_Sample_Conversations.md`
- `Elara_Voss_Visual_Prompt_Pack.md`
- `AI_Character_Project_Plan.md`
- `Proposal_Summary_AI_Character.md`

Memory for a self-hosted browser is local. The architecture note describes a SQLite shape if you later move facts to a server. This app does not store transcripts on the server.

Portraits, locked to one face:

- `public/portraits/elara-studio.jpg`
- `public/portraits/elara-golden-hour.jpg`
- `public/portraits/elara-city.jpg`
- `public/portraits/elara-cinematic.jpg`

The locked description used for every frame is in the visual prompt pack: long wavy dark brown hair, green-hazel eyes, light freckles, natural skin, a slight knowing smile.
