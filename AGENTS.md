---
description: 'Zeg Het Maar — Dutch Rewriter project instructions'
applyTo: '**/*'
---

# Zeg Het Maar — Dutch Rewriter

A web app for learning Dutch. Users can submit Dutch text for AI-powered feedback,
translate English sentences into Dutch, and browse a vocabulary list.

## Architecture

- **Frontend:** Next.js 15+ (App Router), React 19, Tailwind CSS 4.
- **Backend:** Next.js API route handlers (`app/api/*`) — no separate server process.
- **AI Provider:** [OpenRouter](https://openrouter.ai) — default model is `openai/gpt-4o-mini`.

Everything is served from a single Next.js process on a single port.

## Key Files

| Path | Purpose |
|---|---|
| `app/page.tsx` | Server component wrapper; delegates to `HomeClient` |
| `app/HomeClient.tsx` | All client-side logic: tabs, AI calls, selection popup, state |
| `app/api/chat/route.ts` | POST handler: proxies requests to OpenRouter |
| `app/api/health/route.ts` | GET handler: liveness check (no external calls) |
| `app/config.json` | Optional local config for API key and model (not committed) |
| `app/config.example.json` | Example config file — copy to `app/config.json` to use |
| `app/api/words/route.ts` | CRUD handler for word entries (list/add/edit/delete/favorite) |
| `app/lib/driveStore.ts` | Reads/writes the word list to a Google Drive-synced JSON file |
| `next.config.js` | Next.js config with Turbopack root fix |

## Running the Project

```bash
npm run dev    # Next.js on http://localhost:3000 — frontend + API routes
```

No separate backend process is needed.

## Configuration

The API route handlers resolve the API key and model in this priority order:

1. Environment variable (`OPENROUTER_API_KEY`, `MODEL`)
2. `app/config.json`
3. Hardcoded default model: `openai/gpt-4o-mini`

`app/config.json` is optional and not committed to version control. See `app/config.example.json` for the format.

## Important Design Decisions

- **Single origin:** All API calls from the frontend use relative paths (`/api/chat`, etc.),
  so there are no CORS concerns and no port discovery needed.
- **No WebSockets / streaming:** All AI calls are standard HTTP POST requests.
- **Hydration guard:** `HomeClient` renders `null` on the server and on the initial client pass,
  then switches to the real UI in `useEffect`. This prevents SSR mismatches.
- **Health check is local:** `GET /api/health` returns a hardcoded `{ ok: true }` — it does not
  call OpenRouter, so it never wastes API tokens.
- **Turbopack root:** `next.config.js` sets `turbopack.root: __dirname` to prevent Turbopack from
  walking up to a parent directory with its own `package.json` and breaking module resolution.

## Tabs

| Tab | Description |
|---|---|
| **Herschrijver** | Paste Dutch text, get AI feedback: likely meaning, errors, and a rewrite suggestion |
| **Engels → Nederlands** | Translate an English sentence into 2–3 natural Dutch options |
| **Fraselijst** | Browse, add, edit, delete, and favorite saved words/phrases (stored via `app/api/words`); examples are collapsible per entry; each entry has a "ChatGPT" button that opens `chatgpt.com` in a new tab with a prompt to explain that word |

## Selection Popup

Highlighting any text inside the Herschrijver response area triggers a floating popup that calls
`/api/chat` with an explanation prompt. The popup closes on any click outside it.

## Logging

All fetch calls in `HomeClient.tsx` log errors to the browser console with a `[tag]` prefix
(e.g. `[sendRequest]`, `[handleTranslate]`, `[handleTextSelection]`). The API route handler logs
HTTP status and error detail for every failed OpenRouter request.
