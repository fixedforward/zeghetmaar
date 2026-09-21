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
| `app/hooks/usePracticeEngine.ts` | Shared prompt-generation + answer-evaluation for a single phrase, used by both `usePhrasePractice` and `useOefenSessie`; exposes both a stateful `generatePrompt` and a raw `fetchPromptFor` for prefetch-aware callers |
| `app/hooks/usePhrasePractice.ts` | Practice modal state: generates a prompt, evaluates the user's answer |
| `app/hooks/useOefenSessie.ts` | Oefensessie tab state: preview/session phrases, navigation, and a prompt cache (`Map` keyed by phrase id, in-flight fetches deduped) that prefetches every previewed phrase's prompt in the background as soon as the preview loads |
| `app/hooks/useExercises.ts` | Extra Oefeningen state, persisted to `localStorage` |
| `app/hooks/useQuiz.ts` | Quiz tab state: file list, pairs, current question, derived score, `jumpTo` |
| `app/components/*Tab.tsx` | One component per tab (`FraselijstTab`, `HerschrijverTab`, `VertalerTab`, `OefeningenTab`, `QuizTab`) |
| `app/components/PracticeModal.tsx` | Modal for the phrase-practice flow |
| `app/components/SelectionPopup.tsx` | Floating explain-this-text popup (Herschrijver) |
| `app/components/ErrorBoundary.tsx` | Wraps each tab so one tab crashing doesn't take down the app |
| `app/api/chat/route.ts` | POST handler: proxies to OpenRouter, races free models |
| `app/api/words/route.ts` | GET/POST/PUT/DELETE for the phrase list; writes require an authenticated session |
| `app/api/tags/route.ts` | PUT/DELETE for bulk tag operations — rename or remove a tag across every phrase that has it; login required |
| `app/api/quiz/files/route.ts` | GET handler: lists quiz files in the configured Drive folder; login required |
| `app/api/quiz/files/[id]/route.ts` | GET handler: reads and parses one quiz file into sentence pairs; login required |
| `app/api/practice-log/[type]/route.ts` | GET/POST/DELETE for a daily practice counter (`type` is `oefensessie` or `quiz`, tracked independently) — DELETE undoes a check-in; login required |
| `app/api/health/route.ts` | GET handler: liveness check (no external calls) |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth route handlers |
| `auth.ts` | NextAuth config: Google provider, allowed-email check, custom error redirect |
| `app/lib/driveStore.ts` | Reads/writes the phrase list JSON on Google Drive; also holds `renameTag`/`deleteTag` for bulk tag edits, and `getPracticedDatesAsync`/`markPracticedDateAsync` for the practice tracker |
| `app/lib/practiceLog.ts` | Pure helpers for the practice counters: log-type namespacing, ISO-date ↔ (year, day-of-year), per-year bitmap encode/decode |
| `app/lib/date.ts` | `todayLocalIso()` — today's date as `YYYY-MM-DD` in the browser's local timezone |
| `app/hooks/usePracticeTracker.ts` | Client state for one practice counter (`oefensessie` or `quiz`): loads/marks practiced days, calls `/api/practice-log/[type]` |
| `app/components/PracticeCounter.tsx` | "X dagen geoefend" count plus a check-in button that also lets you cancel today's check-in, used in Oefensessie and Quiz |
| `app/components/TagsSelect.tsx` | Dropdown for picking existing tags (checkboxes) or creating a new one, used in the add form and `PhraseDetailModal` |
| `app/components/TagsManageModal.tsx` | "Tags beheren" modal: rename or delete a tag across every phrase that has it, via `/api/tags` |
| `app/lib/driveQuizStore.ts` | Lists/reads quiz files from a Drive folder and parses them into sentence pairs |
| `app/lib/chatgpt.ts` | Builds a ChatGPT explain-this-phrase URL for the "Open in ChatGPT" links |
| `app/lib/shuffle.ts` | Generic Fisher–Yates `shuffleArray` helper |
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

Optional:

- `database.googleQuizFolder.folderId` — Drive folder holding quiz text files, readable
  by the same service account as above. Enables the Quiz tab; if unset, the app still
  starts normally and the Quiz tab's file-list endpoint returns a "not configured" error.

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
- **Custom auth error page:** `auth.ts` sets `pages.error: '/'`, so a rejected sign-in (an
  email outside `allowedEmails`) redirects to `/?error=AccessDenied` instead of NextAuth's
  default `/api/auth/error` page. `HomeClient.tsx` reads that `error` query param on mount,
  shows a dismissible Dutch error banner (`AUTH_ERROR_MESSAGES`), and strips the param from
  the URL so refreshing doesn't re-show it.
- **Free models are raced, not just called:** `/api/chat` sends free-tier requests to several
  models in parallel batches and returns whichever responds first, to work around free-model
  rate limits and downtime.
- **Service accounts can't create Drive files:** they have no storage quota of their own
  (Google's API rejects `files.create` outside a Shared Drive with "Service Accounts do not
  have storage quota"). Every Drive-backed feature must reuse a file the service account
  already has write access to (the phrase-list file, or a quiz file) rather than creating a
  new one — see the practice tracker below for how that shapes its storage.

## Tabs

| Tab | Description |
|---|---|
| **Fraselijst** | Personal phrase list backed by Google Drive; add/edit/delete/favorite (login required), tags per phrase picked from a dropdown of existing tags (or typed to create a new one) with a tag filter bar and a "Tags beheren" modal to rename/delete tags across all phrases, collapsible examples, launches phrase practice, and a "ChatGPT" button per entry that opens a ChatGPT popup window with a prompt to explain that word |
| **Herschrijver** | Paste Dutch text, get AI feedback: likely meaning, errors, and a rewrite suggestion |
| **Engels → Nederlands** | Translate an English sentence into 2–3 natural Dutch options |
| **Extra Oefeningen** | User-managed list of external exercise links, persisted in `localStorage` |
| **Quiz** | Flashcard self-check on sentences from a `.txt` file in a configured Drive folder; login required |

## Phrase Practice

Clicking "practice" on a phrase in Fraselijst opens `PracticeModal`: the AI generates a short
Dutch scenario meant to prompt that phrase in a natural answer, the user answers, and the AI
evaluates the answer and suggests an improvement. Driven by `usePhrasePractice.ts`.

## Selection Popup

Highlighting any text inside the Herschrijver response area triggers a floating popup that calls
`/api/chat` with an explanation prompt. The popup closes on any click outside it.

## Quiz

The Quiz tab lists `.txt` files from a Drive folder (`database.googleQuizFolder.folderId`).
Each file is expected to hold a numbered list of Dutch sentences followed by a numbered list of
matching English sentences (`app/lib/driveQuizStore.ts`'s `parseQuizFile`). Picking a file
loads its sentence pairs in random order (`shuffleArray`) and shows them as flashcards:
the Dutch sentence is the question, "Toon antwoord" reveals the English translation, then
the user self-marks Goed/Fout. An "Overzicht" list below the card shows every question with
its answered/unanswered status; clicking one jumps straight to it (`useQuiz.ts`'s `jumpTo`).
Score is derived from the per-question answers array rather than tracked separately, so
jumping back and re-marking a question updates the score correctly instead of double-counting.
Highlighting a word or sentence in either the question or the answer shows a floating
"Open in ChatGPT" link (`app/lib/chatgpt.ts`), same mechanism as the Selection Popup above
but linking out instead of calling `/api/chat`. The whole tab requires login, unlike
Herschrijver/Vertaler.

## Practice Tracker

Oefensessie and Quiz each show a small counter (`PracticeCounter.tsx`) when logged in: "X
dagen geoefend" plus a check-in button that toggles between "Vandaag inchecken" and "✓
Vandaag ingecheckt (annuleren)" — clicking it again undoes today's check-in. The two are
tracked completely independently — Oefensessie only counts submitting an answer in
`useOefenSessie` (`usePracticeEngine`'s optional `onPractice` callback), Quiz only counts
marking a question Goed/Fout in `useQuiz`'s `markAndNext`. The button's manual check-in
(`markPracticedToday()`) is a no-op if today is already marked; canceling
(`cancelPracticedToday()`) is a no-op if it isn't, and un-marking today doesn't block a
later real action (or another manual check-in) from re-marking it. Nothing outside these
two tabs (Fraselijst, Herschrijver, Vertaler, the phrase practice modal) affects either
counter.

`HomeClient.tsx` holds two `usePracticeTracker` instances (`'oefensessie'` and `'quiz'`),
each independently loading/marking/canceling via `GET`/`POST`/`DELETE
/api/practice-log/[type]` (login-gated).

Storage needed to sync across devices without a new Drive file (service accounts can't
create one — see Important Design Decisions), so practiced days are encoded as a per-year
bitmap and stored as `appProperties` directly on the existing phrase-list Drive file, one
key per log type per year: `practice_oefensessie_2026` / `practice_quiz_2026` → a base64'd
46-byte bitmap, one bit per day-of-year. That keeps the whole history well under Drive's
124-byte-per-property limit (`app/lib/practiceLog.ts` has the encode/decode and log-type
namespacing; `driveStore.ts`'s `getPracticedDatesAsync`/`markPracticedDateAsync` read/write
it, both taking a `PracticeLogType` first argument).

## Logging

Hooks and components log errors to the browser console with a `[tag]` prefix (e.g.
`[usePhrasePractice]`). The API route handlers log HTTP status and error detail for failed
OpenRouter or Google Drive requests.
