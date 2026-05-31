# Spur AI Live Chat

A production-minded take-home implementation of a Spur-branded AI live chat widget. It uses a Svelte frontend, a TypeScript/Express backend, SQLite persistence, and Gemini through Google AI Studio.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create an environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill in `.env`:

   ```bash
   GEMINI_API_KEY=your_google_ai_studio_key_here
   GEMINI_MODEL=gemini-3.5-flash
   DATABASE_PATH=./data/spur-chat.sqlite
   PORT=8787
   CLIENT_ORIGIN=http://localhost:5173
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:5173`.

SQLite is initialized automatically on server startup. The database file is created at `DATABASE_PATH`, and the schema includes `conversations` and `messages`.

## Production Run

```bash
npm run build
npm start
```

The Express server serves the built Svelte app from `dist/client` and exposes the chat API from the same origin.

## API

`POST /chat/message`

```json
{
  "message": "How does Spur live chat work?",
  "sessionId": "optional-existing-session-id"
}
```

Returns:

```json
{
  "reply": "Spur Live Chat...",
  "sessionId": "conversation-id",
  "degraded": false
}
```

`GET /chat/history/:sessionId` returns persisted messages for reloads.

## Architecture

- `server/index.ts` wires Express, CORS, JSON limits, static hosting, health checks, and error handling.
- `server/routes/chat.ts` keeps HTTP routing thin.
- `server/services/chatService.ts` validates input, creates or loads sessions, persists both user and AI messages, and converts LLM failures into user-safe replies.
- `server/services/gemini.ts` owns the Gemini REST call, timeout, model config, history compaction, and prompt assembly.
- `server/db/database.ts` owns SQLite schema and persistence helpers.
- `server/knowledge/spurKnowledge.ts` contains curated Spur context from the public site.
- `src/App.svelte` and `src/components/*` implement the responsive Spur-style chat UI.

## LLM Notes

Provider: Gemini via the Google AI Studio REST API.

Model default: `gemini-3.5-flash`, with a server-side fallback to `gemini-2.5-flash` if that model is unavailable for the configured key.

The system instruction constrains the assistant to Spur-specific support, sales, pricing, integration, setup, and automation questions. It tells the model to decline unrelated trivia and route account-specific, legal, refund, or billing commitments to Spur support.

The backend sends a compact slice of recent conversation history and caps output tokens for cost control.

## Robustness

- Empty or whitespace-only messages are rejected.
- Messages over 2,000 characters are rejected with a clean error.
- Invalid session IDs are rejected.
- Unknown sessions return a clean not-found response.
- Gemini timeouts, invalid keys, rate limits, and provider errors are caught; the app persists and displays a friendly fallback reply instead of crashing.
- The API key is read from environment variables only and is intentionally ignored by git.
- AI markdown is rendered client-side through `marked` and sanitized with `dompurify`.

## Product UX Notes

- Follow-up questions are first-class: after every reply, the composer refocuses and switches to an `Ask a follow-up` placeholder.
- Starter questions render as a wrapped, two-column grid instead of a horizontal carousel so first-time users do not mistake them for a broken strip.
- The chat uses illustrated support/customer avatars instead of generic icons to feel closer to a polished embedded support widget.
- The desktop shell mirrors Spur's public site language and visual system, while the mobile layout keeps the chat focused, contained, and composer-visible.
- Product labels in the top nav link to the relevant Spur public pages.

## Tradeoffs

- SQLite keeps the exercise easy to run locally. For a real multi-tenant Spur deployment, PostgreSQL with migrations and row-level ownership would be the next step.
- Responses are non-streaming to keep the API simple and reliable. Server-sent streaming would improve perceived latency.
- The knowledge base is curated in code. A production version would ingest Spur docs, help-center articles, website pages, and PDFs into embeddings with freshness checks.
- Authentication is intentionally omitted because the assignment does not require it.
