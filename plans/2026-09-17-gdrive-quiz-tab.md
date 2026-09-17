# Google Drive quiz tab

- Status: planned

## Context

- Main repo: `/Users/aldo.sebastian/Documents/zeghetmaar`
- Worktree: `/Users/aldo.sebastian/.superset/worktrees/d0856325-40b9-4e35-9f2c-76f2c90b9ba8/aldominiclip/equatorial-spoon`
- Branch: `gdrive-quiz-tab`
- Base branch: `main`

## Goal

- Add a new "Quiz" tab.
- It reads sentence files from a Google Drive folder.
- The tab first shows a list of files in that folder.
- The user picks a file, then gets quizzed on it as flashcards.

## File format (fixed, per file)

- A numbered list of Dutch sentences (`1.` .. `N.`).
- A blank line.
- A numbered list of matching English sentences (`1.` .. `N.`), same order/count.
- Example:
  ```
  1. Bij het renderen van deze grote scène begint mijn oude laptop flink te piepen en kraken.
  2. ...

  1. When rendering this large scene, my old laptop really starts to struggle.
  2. ...
  ```
- Sentence `N` in the Dutch list pairs with sentence `N` in the English list.

## Decisions (from user, already confirmed)

- Quiz mode: flip-card self-check. Show the English sentence, user recalls the Dutch one,
  clicks "reveal" to see it, then self-marks correct/incorrect. No AI grading call.
- File scope: one specific Drive folder (new config field), not the whole Drive.
- Persistence: none. Score and position reset on reload or tab switch.
- Auth: the whole Quiz tab requires login (same allowlist as phrase-list writes) — unlike
  Herschrijver/Vertaler, which work while logged out.

## Standing rules to follow while building

- No code comments unless they explain a non-obvious "why" (end with a period if used).
- Any newly-written function actually declared `async` ends its name in `Async`
  (e.g. `listQuizFilesAsync`, `getQuizPairsAsync`). Does not apply to Next.js route handler
  exports (`GET`) or to hook methods that use `.then()` chains, matching `useWords.ts`.
- Add tests for the new parsing logic and the new hook (repo has no route-level integration
  test precedent, so unit tests on the parser + a fetch-mocked hook test, like
  `useWords.test.ts`, are the right scope).
- Never add Claude as a commit/PR co-author.

## Steps

### Step 1 — Types and optional config field

- Change:
  - `app/types.ts`: add `'quiz'` to the `Tab` union. Add `QuizFile { id, name }` and
    `QuizPair { dutch, english }` interfaces.
  - `app/lib/config.ts`: add optional `database.googleQuizFolder?.folderId` to `AppConfig`. Do
    NOT add it to the required-field checks — missing config must not crash the app.
  - `app/config.example.json`: document the new optional `database.googleQuizFolder.folderId`
    field.
  - `app/lib/driveStore.ts`: export the existing `getDriveClient()` so it can be reused.
- Manual test:
  - Run `npm test`.
  - Expect: all existing tests still pass, no new failures.
  - Run `npm run dev`, open `http://localhost:3000`.
  - Expect: app loads and works exactly as before (no visible change yet).

### Step 2 — Drive quiz file reading and parsing

- Change:
  - New file `app/lib/driveQuizStore.ts`:
    - `isQuizConfigured(): boolean` — true if `database.googleQuizFolder.folderId` is set.
    - `parseQuizFile(text: string): QuizPair[]` — pure function. Reads numbered lines,
      splits into two lists at the point the numbering restarts from 1, pairs them by
      index. Throws a clear error if the two lists are missing or don't match in length.
    - `listQuizFilesAsync(): Promise<QuizFile[]>` — lists files in the configured Drive
      folder (id + name only).
    - `getQuizPairsAsync(fileId: string): Promise<QuizPair[]>` — reads one file's content
      and runs it through `parseQuizFile`.
  - New test file `app/__tests__/driveQuizStore.test.ts` covering `parseQuizFile`:
    - pairs a matching Dutch/English list correctly.
    - ignores blank lines and non-numbered lines.
    - throws when the lists have different lengths.
    - throws when there's only one numbered list.
- Manual test:
  - Run `npm test`.
  - Expect: the new `driveQuizStore.test.ts` tests pass, and everything else still passes.

### Step 3 — API routes

- Change:
  - New `app/api/quiz/files/route.ts`: `GET` — requires login (401 JSON if not), 501 JSON
    if quiz folder isn't configured, otherwise returns the file list as JSON.
  - New `app/api/quiz/files/[id]/route.ts`: `GET` — requires login (401 JSON if not),
    returns the parsed `QuizPair[]` for that file id, or a clear error JSON on failure.
- Manual test:
  - Run `npm run dev`.
  - In a new terminal: `curl -i http://localhost:3000/api/quiz/files`.
  - Expect: HTTP 401 with a JSON error body (not logged in).
  - Add `database.googleQuizFolder.folderId` to your local `app/config.json`, pointing at a real
    Drive folder the service account can read, restart `npm run dev`.
  - Log in through the browser, then in the browser devtools console run:
    `fetch('/api/quiz/files').then(r => r.json()).then(console.log)`.
  - Expect: a JSON array of `{ id, name }` for the files in that Drive folder (or `[]` if
    the folder is empty).

### Step 4 — `useQuiz` hook

- Change:
  - New file `app/hooks/useQuiz.ts`. State: file list + loading/error, selected file,
    pairs + loading/error, current index, revealed flag, score `{ correct, incorrect }`.
    Actions: `loadFiles()`, `selectFile(file)`, `backToFiles()`, `reveal()`,
    `markAndNext(correct)`, `restart()`. Follows the `.then()`-chain, fetch-based style of
    `useWords.ts` (no `async` keyword on hook methods).
  - New test file `app/__tests__/useQuiz.test.ts`, mirroring `useWords.test.ts`'s
    fetch-mocking pattern:
    - `loadFiles()` populates `files` on success.
    - `loadFiles()` sets `filesError` on failure.
    - `selectFile()` loads `pairs`, and `reveal()` + `markAndNext()` update `revealed`,
      `score`, and `currentIndex` correctly.
- Manual test:
  - Run `npm test`.
  - Expect: the new `useQuiz.test.ts` tests pass, and everything else still passes.

### Step 5 — `QuizTab` component and wiring into `HomeClient`

- Change:
  - New file `app/components/QuizTab.tsx`:
    - Not logged in → short message telling the user to log in.
    - Logged in, no file picked → list of files from the hook, a "Start" button per file,
      loading/empty/error states.
    - File picked, pairs loading → loading message.
    - File picked, pairs loaded → flashcard: English sentence, "Toon antwoord" button,
      then on reveal the Dutch sentence plus "Goed" / "Fout" buttons, a progress line
      (`Zin X van Y`, running score), and a "← Ander bestand" link back to the file list.
    - All pairs done → summary with final score and a "Opnieuw" (restart) button.
  - Edit `app/HomeClient.tsx`: import and call `useQuiz()`, add the "Quiz" tab button
    (loads files on click, like the Fraselijst tab loads words), render `QuizTab` wrapped
    in `ErrorBoundary`, pass `isLoggedIn={!!session}`.
- Manual test:
  - Prerequisite: `app/config.json` has `database.googleQuizFolder.folderId` set to a real Drive
    folder (service account can read it), and that folder has at least one file in the
    format described above.
  - Run `npm run dev`, open `http://localhost:3000`, do NOT log in.
  - Click the "Quiz" tab.
  - Expect: a message telling you to log in, no file list.
  - Log in with an allowlisted Google account, click "Quiz" again.
  - Expect: the list of files from the configured Drive folder appears.
  - Click "Start" on a file.
  - Expect: the first English sentence shows, with a "Toon antwoord" button.
  - Click "Toon antwoord".
  - Expect: the matching Dutch sentence appears, plus "Goed" / "Fout" buttons.
  - Click "Goed", then repeat reveal + mark for every remaining sentence.
  - Expect: after the last one, a summary shows with the correct/incorrect count.
  - Click "← Ander bestand".
  - Expect: you're back at the file list and can pick a different file.

### Step 6 — Update docs

- Change:
  - `AGENTS.md`:
    - Key Files table: add `app/lib/driveQuizStore.ts`, `app/hooks/useQuiz.ts`,
      `app/components/QuizTab.tsx`, `app/api/quiz/files/route.ts`,
      `app/api/quiz/files/[id]/route.ts`.
    - Tabs table: add the "Quiz" row (flashcard self-check, login required, reads from a
      Drive folder).
    - Configuration section: mention the optional `database.googleQuizFolder.folderId` field
      and what it unlocks.
  - `README.md`: add the "Quiz" row to the tabs table near the top.
- Manual test:
  - Read the updated sections in `AGENTS.md` and `README.md`.
  - Expect: they accurately describe the Quiz tab as actually built (mode, auth
    requirement, config field).

## Documentation impact

- Yes. `AGENTS.md` (canonical doc) and `README.md`'s tabs table both go out of date
  without this change. Covered by Step 6 (last step).

## Log
