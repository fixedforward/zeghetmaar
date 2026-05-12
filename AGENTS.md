---
description: 'Zeg Het Maar — Dutch Rewriter project instructions'
applyTo: '**/*'
---

# Zeg Het Maar — Dutch Rewriter

A web app for learning Dutch. Users can submit Dutch text for AI-powered feedback,
translate English sentences into Dutch, and browse a vocabulary list.

## Architecture

- **Frontend:** Next.js 15+ (App Router), React 19, Tailwind CSS 4.
- **Backend:** Custom Node.js HTTP server (`server/index.js`) that proxies requests to the OpenRouter API.
- **AI Provider:** [OpenRouter](https://openrouter.ai) — default model is `openai/gpt-4o-mini`.

## Key Files

| Path | Purpose |
|---|---|
| `app/page.tsx` | Server component wrapper; delegates to `HomeClient` |
| `app/HomeClient.tsx` | All client-side logic: tabs, AI calls, selection popup, state |
| `app/api/port/route.ts` | Next.js API route that exposes the backend port to the frontend |
| `server/index.js` | Node.js backend: health check, `/api/chat` proxy, port discovery |
| `server/config.json` | Optional local config for API key and model (not committed) |
| `server/port.json` | Auto-generated on server start; holds the active port number |
| `public/woordenlijst.json` | Static word list data for the Vocabulary tab |
| `next.config.js` | Next.js config with Turbopack root fix |

## Running the Project

Run both the Next.js dev server and the Node backend together:

```bash
npm run dev:all
```

Or separately:

```bash
npm run dev        # Next.js frontend on http://localhost:3000
npm run server:dev # Node backend (nodemon) — dynamic port, prefers 9292
```

## Configuration

The backend resolves its API key and model in this priority order:

1. Environment variable (`openrouterApiKey`, `model`)
2. `server/config.json`
3. Hardcoded default model: `openai/gpt-4o-mini`

`server/config.json` is optional and not committed to version control. Example:

```json
{
  "openrouterApiKey": "sk-or-...",
  "model": "openai/gpt-4o-mini"
}
```

## Port Discovery

The backend uses `get-port` (ESM-only, imported via dynamic `import()`) to find a free port,
preferring `9292`. The chosen port is written to `server/port.json`. The frontend reads it via
`/api/port` on startup so it always knows where the backend is.

## Important Design Decisions

- **No WebSockets / streaming:** Removed to keep the architecture simple. All AI calls are
  standard HTTP POST requests.
- **Hydration guard:** `HomeClient` renders `null` on the server and on the initial client pass,
  then switches to the real UI in `useEffect`. This prevents SSR mismatches caused by
  `localStorage` access and the dynamic port fetch.
- **Health check is local:** `GET /api/health` returns a hardcoded `{ ok: true }` — it does not
  call OpenRouter, so it never wastes API tokens.
- **Turbopack root:** `next.config.js` sets `turbopack.root: __dirname` to prevent Turbopack from
  walking up to a parent directory with its own `package.json` and breaking module resolution.

## Tabs

| Tab | Description |
|---|---|
| **Herschrijver** | Paste Dutch text, get AI feedback: likely meaning, errors, and a rewrite suggestion |
| **Engels → Nederlands** | Translate an English sentence into 2–3 natural Dutch options |
| **Woordenlijst** | Browse `public/woordenlijst.json`; examples are collapsible per entry |

## Selection Popup

Highlighting any text inside the Herschrijver response area triggers a floating popup that calls
`/api/chat` with an explanation prompt. The popup closes on any click outside it.

## Logging

All backend fetch calls in `HomeClient.tsx` log to the browser console with a `[tag]` prefix
(e.g. `[backend]`, `[sendRequest]`). The Node server logs HTTP status and error detail for every
failed OpenRouter request.
