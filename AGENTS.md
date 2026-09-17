---
description: 'Zeg Het Maar — Dutch Rewriter project instructions'
applyTo: '**/*'
---

# Zeg Het Maar — Dutch Rewriter

A web app for learning Dutch. Users can submit Dutch text for AI-powered feedback,
translate English sentences into Dutch, manage a personal phrase list, practice phrases
in mini AI-graded conversations, and keep a list of external exercise links.

## Architecture

- **Frontend:** Next.js 15+ (App Router), React 19, Tailwind CSS 4.
- **Backend:** Next.js API route handlers (`app/api/*`) — no separate server process.
- **AI Provider:** [OpenRouter](https://openrouter.ai). Free-tier models are raced in
  parallel batches (`app/lib/raceModels.ts`) so the fastest response wins; non-free
  models are called directly.
- **Auth:** Google login via NextAuth (`auth.ts`), restricted to an allowlist of emails.
  Only used to gate writes to the phrase list — reading and the AI tabs work when logged out.
- **Storage:** the phrase list is not a static file — it's a JSON blob stored in Google
  Drive, read/written via a service account (`app/lib/driveStore.ts`). Exercise links are
  stored in the browser's `localStorage` instead.

Everything is served from a single Next.js process on a single port.

## Key Files

| Path | Purpose |
|---|---|
| `app/page.tsx` | Server component wrapper; delegates to `HomeClient` |
| `app/HomeClient.tsx` | Thin shell: tab switching, model picker, login/logout UI, wires hooks to tab components |
| `app/hooks/useWords.ts` | Fraselijst state + CRUD calls to `/api/words` |
| `app/hooks/useAiChat.ts` | Herschrijver + Vertaler state, selection popup, calls to `/api/chat` |
| `app/hooks/usePhrasePractice.ts` | Practice modal state: generates a prompt, evaluates the user's answer |
| `app/hooks/useExercises.ts` | Extra Oefeningen state, persisted to `localStorage` |
| `app/components/*Tab.tsx` | One component per tab (`FraselijstTab`, `HerschrijverTab`, `VertalerTab`, `OefeningenTab`) |
| `app/components/PracticeModal.tsx` | Modal for the phrase-practice flow |
| `app/components/SelectionPopup.tsx` | Floating explain-this-text popup |
| `app/components/ErrorBoundary.tsx` | Wraps each tab so one tab crashing doesn't take down the app |
| `app/api/chat/route.ts` | POST handler: proxies to OpenRouter, races free models |
| `app/api/words/route.ts` | GET/POST/PUT/DELETE for the phrase list; writes require an authenticated session |
| `app/api/health/route.ts` | GET handler: liveness check (no external calls) |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth route handlers |
| `auth.ts` | NextAuth config: Google provider, allowed-email check |
| `app/lib/driveStore.ts` | Reads/writes the phrase list JSON on Google Drive |
| `app/lib/raceModels.ts` | Races free OpenRouter models against each other with a timeout |
| `app/lib/apiClient.ts` | Shared `chatRequest` helper for calling `/api/chat` |
| `app/lib/config.ts` | Loads and validates `app/config.json` |
| `app/config/models.ts` | Selectable models (`MODEL_OPTIONS`), free-model list (`GRATIS_MODELS`), default model |
| `app/config.json` | Optional local config for API key, Drive file ID/service account, and auth secrets (not committed) |
| `app/config.example.json` | Example config file — copy to `app/config.json` to use |
| `next.config.js` | Next.js config with Turbopack root fix |

`public/woordenlijst.json` is no longer used — the phrase list now lives on Google Drive.

## Running the Project

```bash
npm run dev    # Next.js on http://localhost:3000 — frontend + API routes
```

No separate backend process is needed.

## Configuration

`app/lib/config.ts` loads `app/config.json` (checked at `./config.json` then `./app/config.json`)
and throws at startup if required fields are missing. There is no environment-variable
fallback for these — `config.json` is required. It must provide:

- `aiProviders.openRouterApiKey` — OpenRouter API key.
- `database.googleJsonFile.googleDriveFileId` + `.serviceAccount` — Drive file holding the
  phrase list, and the service-account credentials used to read/write it.
- `auth.nextAuthSecret`, `auth.oauth2Providers.google.clientId` / `.clientSecret` /
  `.allowedEmails` — Google OAuth app credentials and the emails allowed to log in.

See `app/config.example.json` for the full shape. The default selectable model is set in
`app/config/models.ts` (`DEFAULT_MODEL`), not via config.

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
- **Read-only without login:** anyone can browse the phrase list and use the AI tabs; only
  adding/editing/deleting phrases requires a Google login from the allowlist.
- **Free models are raced, not just called:** `/api/chat` sends free-tier requests to several
  models in parallel batches and returns whichever responds first, to work around free-model
  rate limits and downtime.

## Tabs

| Tab | Description |
|---|---|
| **Fraselijst** | Personal phrase list backed by Google Drive; add/edit/delete (login required), collapsible examples, launches phrase practice |
| **Herschrijver** | Paste Dutch text, get AI feedback: likely meaning, errors, and a rewrite suggestion |
| **Engels → Nederlands** | Translate an English sentence into 2–3 natural Dutch options |
| **Extra Oefeningen** | User-managed list of external exercise links, persisted in `localStorage` |

## Phrase Practice

Clicking "practice" on a phrase in Fraselijst opens `PracticeModal`: the AI generates a short
Dutch scenario meant to prompt that phrase in a natural answer, the user answers, and the AI
evaluates the answer and suggests an improvement. Driven by `usePhrasePractice.ts`.

## Selection Popup

Highlighting any text inside the Herschrijver response area triggers a floating popup that calls
`/api/chat` with an explanation prompt. The popup closes on any click outside it.

## Logging

Hooks and components log errors to the browser console with a `[tag]` prefix (e.g.
`[usePhrasePractice]`). The API route handlers log HTTP status and error detail for failed
OpenRouter or Google Drive requests.
