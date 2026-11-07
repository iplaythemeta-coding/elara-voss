# Technical Architecture & Implementation Notes
**Project:** Elara Voss AI Character  
**Target:** Single-platform MVP (Telegram recommended)

## Core Flow

```
Incoming Message
    → Rate limit + basic content filter
    → Retrieve relevant memory (user facts + last N turns)
    → Assemble prompt:
        [System Prompt]
        [User Memory Block]
        [Recent Conversation History]
        [Current User Message]
    → LLM Call
    → Post-process (style check, optional image gen trigger)
    → Send response
    → Update memory if new facts detected
```

## Recommended Implementation Stack

- **Language:** Python 3.11+
- **Bot Framework:** python-telegram-bot (async)
- **LLM:** Configurable (Claude 3.5 Sonnet primary, Grok / GPT-4o fallback)
- **Memory:** 
  - Short-term: conversation history (last 10–20 turns)
  - Long-term: SQLite table of user facts + optional vector store for semantic recall
- **Image Generation:** On-demand via Flux or Grok Imagine API when user requests a picture of Elara or a scene
- **Hosting:** Railway or Fly.io (simple deployment, low cost for MVP)

## Memory Schema (SQLite example)

```sql
CREATE TABLE user_facts (
    user_id TEXT,
    fact_key TEXT,
    fact_value TEXT,
    confidence REAL,
    last_updated TIMESTAMP,
    PRIMARY KEY (user_id, fact_key)
);

CREATE TABLE conversation_log (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    role TEXT, -- 'user' or 'assistant'
    content TEXT,
    timestamp TIMESTAMP
);
```

## Guardrail Layer (lightweight)

- Pre-filter: keyword / classifier for extreme content
- Post-filter: Check response for identity collapse or prohibited topics
- Fallback response if guardrail triggers

## Expansion Path

1. **Voice:** ElevenLabs or Cartesia streaming TTS
2. **Additional Platforms:** Discord, custom web chat
3. **Advanced Memory:** Vector embeddings for long-term semantic memory
4. **Analytics:** Simple dashboard of conversation volume, popular topics, failure modes

## Overnight Status
Core design complete. Ready for code scaffolding if client proceeds or for proposal packaging.
