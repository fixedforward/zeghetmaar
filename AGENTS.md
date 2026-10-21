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
| `app/hooks/useCloze.ts` | Cloze tab state, two session modes sharing one question queue: `typen` (type the missing word, Clozemaster-style) and `kaarten` (Anki-style flip cards built by `buildFlashcards`: `reveal()` then `markAndNext(correct)`; each phrase produces two shuffled cards with a per-card `reversed` flag for both directions); plus `gemengd`, which shuffles both kinds into one session (each item carries its own `mode`, exposed as `questionMode`, and counts toward that mode's daily counter); a wrong answer is requeued 2–5 cards later in all of them |
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
| `app/api/articles/route.ts` | GET handler: lists subfolders + articles (Google Docs / `.txt`) in a Drive folder (`?folderId=`, defaults to the configured root); login required |
| `app/api/articles/[id]/route.ts` | GET handler: reads one article as plain text, split into paragraphs; login required |
| `app/api/practice-log/[type]/route.ts` | GET/POST/DELETE for a daily practice counter (`type` is `oefensessie` or `quiz`, tracked independently) — DELETE undoes a check-in; login required |
| `app/api/marked-files/[kind]/route.ts` | GET/POST/DELETE for ticked-off Drive files (`kind` is `quiz` → "voorbereid" quiz files, or `articles` → "gelezen" articles); POST marks, DELETE unmarks; login required |
| `app/api/luisteren/route.ts` | GET/POST/DELETE for the Luisteren YouTube links (POST `{ url, title }` rejects non-YouTube URLs, PUT `{ id, positionSeconds?, phrases? }` updates a link — where you left off (`null` clears it) and/or its noted phrases, DELETE `{ id }`); login required |
| `app/api/luisteren/lessons/[folderId]/route.ts` | GET handler (`?file=<mediaFileId>`): one listening lesson = an .mp3/.mp4 in that Drive folder plus the `.srt` with the **same name** next to it; returns the media file id, the expected `.srt` name, the `.srt`'s file id (`subtitleFileId`, null when missing) and the parsed cues (empty when the `.srt` is missing), 404 if the file isn't a playable file in that folder; login required. The folder id is passed in because Drive doesn't return `parents` for link-shared files |
| `app/api/luisteren/tree/route.ts` | GET handler: the whole `googleListeningFolder` tree in one response (recursive, max 5 levels deep), keeping only .mp3/.mp4 files (each with `hasSubtitles`) and the folders that hold one; 501 if the folder isn't configured; login required |
| `app/api/luisteren/media/[id]/route.ts` | GET handler: streams a Drive video/audio file to `<video>`, passing the browser's `Range` header on to Drive (206 Partial Content) so seeking only downloads what's needed; refuses non-media files (415); login required |
| `app/api/pictures/route.ts` | GET handler: lists the images (`image/*`) in the `googlePicturesFolder` Drive folder, sorted by name; 501 if the folder isn't configured; login required |
| `app/api/pictures/[id]/route.ts` | GET handler: streams one Drive image to `<img>` (refuses non-images with 415); login required |
| `app/api/mistakes/route.ts` | GET/PUT for the Fouten tab: GET reads and parses the mistakes `.tsv` (`googleMistakesFile`), PUT `{ row, mistake, timesPracticed?, correction? }` sets one row's `noOfTimesPracticed` and/or `Mogelijke verbetering` and uploads the file again and DELETE `{ row, mistake }` removes that row (both 409 if that row no longer holds that mistake, so an edited file can't change the wrong row); 501 if not configured; login required |
| `app/lib/mistakes.ts` + `app/lib/driveMistakeStore.ts` | Mistakes `.tsv`: `parseMistakesTsv` (columns found by header name: `Mijn fout`, `Mogelijke verbetering`, `Type fout` (optional), `noOfTimesPracticed`, `englishTranslation` (optional), `herformulering` (optional: a more natural wording, shown as "Natuurlijker" after the answer and in the overview)), `updateMistakeInTsv` (changes only the `noOfTimesPracticed` and/or `Mogelijke verbetering` cell, keeps line endings; `cleanCell` strips tabs/line breaks), `deleteRowFromTsv` + `shiftRowsAfterDelete` (rows below a deleted one move up a line), `orderLeastPracticedFirst`; the store reads it with `readDriveTextFileAsync` and writes it with `files.update` |
| `app/hooks/useMistakes.ts` + `app/components/FoutenTab.tsx` | "Vertaling oefenen" tab (key `fouten`): a start screen like Cloze (filter + "Start (N zinnen)" + the overview; "✕ Stoppen" goes back to it), then one sentence at a time, least practiced first, optionally only the sentences marked Goed 0×, 1×, 2× or 3×+ ("Oefen zinnen" dropdown on the start screen, `matchesPracticedFilter`); shows the `englishTranslation` and you type the Dutch (a row without a translation falls back to "fix this mistake"), "Toon antwoord" shows `Mogelijke verbetering` in a text box you can edit and save ("Opslaan", `saveCorrectionAsync`) (and the earlier mistake), "Vraag ChatGPT" opens ChatGPT with the English sentence, my translation, the possible translation and the earlier mistake (`mistakeFixCheckPrompt`), "Goed (+1)" is an undoable toggle that saves `noOfTimesPracticed` + 1 to Drive (optimistic, rolled back on failure) and marks the `fouten` day counter; a card not marked Goed comes back 2–5 cards later; "Overslaan ⏭" (before or after the answer) skips a sentence for the rest of the session without counting it; "📝 Vandaag N zinnen geoefend" counts the sentences whose answer you looked at today (each once, kept in `localStorage`, so per device; `app/lib/practicedToday.ts`); an "Overzicht" list of every mistake (correction, type, count) below the card; "✕ Verwijderen" (with a Ja/Nee confirm) on the card and on each overview row deletes that row from the `.tsv` |
| `app/lib/requeue.ts` | `randomRequeueGap` + `insertLater`: the "wrong answer comes back 2–5 cards later" step shared by Quiz, Cloze and Fouten |
| `app/api/health/route.ts` | GET handler: liveness check (no external calls) |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth route handlers |
| `auth.ts` | NextAuth config: Google provider, allowed-email check, custom error redirect |
| `app/lib/driveStore.ts` | Reads/writes the phrase list JSON on Google Drive; also holds `renameTag`/`deleteTag` for bulk tag edits, `getPracticedDatesAsync`/`markPracticedDateAsync` for the practice tracker, `getMarkedFileIdsAsync`/`setFileMarkedAsync` for the quiz/article checkboxes (stored as `preparedQuizFileIds` / `readArticleIds` on the same JSON root), and `get/add/deleteListeningLinkAsync` + `updateListeningLinkAsync` for the Luisteren links (`listeningLinks` on that root) |
| `app/lib/wordFilters.ts` + `app/components/DayRangeSelect.tsx` | "Toegevoegd" filter shared by Cloze, Quiz (Fraselijst) and Oefensessie: phrases added vandaag–3, 3–7, 7–14 or 14–21 days ago (`from` inclusive, `to` exclusive), or alle; default vandaag–3 |
| `app/lib/practiceLog.ts` | Pure helpers for the practice counters: log-type namespacing, ISO-date ↔ (year, day-of-year), per-year bitmap encode/decode |
| `app/lib/date.ts` | `todayLocalIso()` — today's date as `YYYY-MM-DD` in the browser's local timezone |
| `app/hooks/usePracticeTracker.ts` | Client state for one practice counter (`oefensessie` or `quiz`): loads/marks practiced days, calls `/api/practice-log/[type]` |
| `app/components/PracticeCounter.tsx` | "X dagen geoefend" count plus a check-in button that also lets you cancel today's check-in, used in Oefensessie and Quiz |
| `app/components/TagsSelect.tsx` | Dropdown for picking existing tags (checkboxes) or creating a new one, used in the add form and `PhraseDetailModal` |
| `app/components/TagsManageModal.tsx` | "Tags beheren" modal: rename or delete a tag across every phrase that has it, via `/api/tags` |
| `app/lib/driveQuizStore.ts` | Lists/reads quiz files from a Drive folder and parses them into sentence pairs; also exports `readDriveTextFileAsync` (Google Doc → plain-text export, other files → raw download) |
| `app/lib/driveArticleStore.ts` | Lists article folders and reads articles for the Artikelen tab; folders come first by name, articles newest first by Drive `createdTime`. Also holds the shared `listDriveFolderFilesAsync` (raw folder listing) and `isDriveId` (route param check) |
| `app/hooks/useArticles.ts` | Artikelen tab state: folder breadcrumb stack, open article, read-article checkboxes |
| `app/hooks/useMarkedFiles.ts` | Shared checkbox state for a `MarkedFileKind`: loads ids and optimistically toggles one via `/api/marked-files/[kind]`; used by `useQuiz` (voorbereid) and `useArticles` (gelezen) |
| `app/hooks/useChatGptSelection.ts` + `app/components/ChatGptSelectionLink.tsx` | Shared "select text → Open in ChatGPT" floating link (context is a fixed text or a function of the current selection), used by Quiz, Artikelen and the Luisteren test page; an optional `onAddPhrase` prop adds a "+ Fraselijst" button (Artikelen and the Luisteren player page). Opens via `openChatGptWithPromptAsync`: a prompt too long for a URL (e.g. a very long article) is copied to the clipboard instead, and the link then shows a "plak met ⌘V" hint |
| `app/hooks/useLuisteren.ts` + `app/components/LuisterenTab.tsx` | Luisteren tab: add a YouTube link (optional title), list them newest first, click to open the video in a separate popup window on the other half of the screen (`app/lib/popup.ts`), a "where I left off" field per link (compact `mmss` like `1723` = 17:23, parsed by `parseCompactTimestamp` in `app/lib/youtube.ts`; the link opens at that point via `t=…s`), a collapsible "Woorden" list per link for words/phrases heard in that video (each with an optional `mmss` time it was said and a ▶ button that opens the video 5 s before it; each can be sent to the Fraselijst via `AddPhraseModal` and is then marked ✓ `imported`), delete with a confirm |
| `app/lib/youtube.ts` | `isYouTubeUrl()` — accepts youtube.com / youtu.be links only, used by both the tab form and the API |
| `app/lib/srt.ts` | `parseSrt` (SRT text → sorted `{ start, end, text }` cues), `findActiveCueIndex` (binary search for the last cue that has started) and `sentencesAroundCues` (ChatGPT context: N real sentences around a range of cues) |
| `app/lib/driveListeningStore.ts` | `getListeningTreeAsync` (the pruned .mp3/.mp4 folder tree), `getListeningLessonAsync` (a media file plus its same-name `.srt`), `subtitleFileName`/`isPlayableFileName`, and `getDriveMediaAsync` (Range-aware Drive download stream) |
| `app/lib/swipe.ts` + `app/hooks/useSwipeGestures.ts` | Double-tap (with `tapZone`: left/middle/right third) vs. left/right swipe detection for pointer events, plus `createWheelSwipeTracker` that turns a two-finger trackpad swipe (a burst of wheel events) into one swipe; the hook adds a non-passive wheel listener so it can stop the browser's back/forward swipe |
| `app/luisteren-test/page.tsx` + `app/components/TranscriptPlayer.tsx` + `app/hooks/useTranscriptPlayer.ts` | Player page (`/luisteren-test?folder=<folderId>&file=<mediaFileId>`, opened from the Luisteren tab's Drive tree, with a "← Luisteren" link back to `/?tab=luisteren`): video/audio from Drive next to its transcript, sized by "Grootte" buttons (Klein/Middel/Groot/Maximaal: video column 1/3, 1/2, 2/3 or full width of a page up to 1600 px, at most 40/55/70/85% of the screen height; default Groot; Maximaal puts the transcript below the video), remembered in `localStorage` (`useVideoSize`, presets in `app/lib/videoSize.ts`); when the same-name `.srt` is missing it still plays and shows "Ondertitels niet gevonden" with the expected file name instead of the transcript; the full transcript ("Volledige ondertiteling tonen", hidden by default) highlights the current line and keeps it at the top of the list, clicking a line jumps there; the current subtitle is shown in a box below the video with "Vraag ChatGPT" and "+ Fraselijst", and touching that box pauses; a see-through layer over the picture (leaving the native control bar free) turns a double-tap/double-click into play/pause in the middle third and 5 s back/forward in the left/right third (a single tap does nothing), and a left/right swipe (finger, mouse drag or two-finger trackpad) into 5 s back/forward; "⏮ Vorige"/"Volgende ⏭" jump to the previous/next subtitle (`seekToCueBy`); Space plays/pauses and `←`/`a` and `→`/`d` go 5 s back/forward (not while typing in a field, with ⌘/Ctrl/Alt, or while a modal is open; the handler calls preventDefault so a focused button or the native controls don't react too), −5s/+5s skip buttons, a "⏱ Spring naar…" dropdown that jumps to every 5 minutes of the video (`intervalStarts` in `app/lib/youtube.ts`, shown once the video's length is known and it's longer than 5 minutes), a round "?" button that shows/hides the usage help (hidden by default), the subtitle box's "+ Fraselijst" pauses the video and opens `AddPhraseModal` with the current subtitle line, an "Uitleg" button beside each transcript line (shown on hover and on the current line) opens ChatGPT about that line's whole sentence(s), and selecting transcript text opens the shared ChatGPT selection link (with "+ Fraselijst", using `useWords` with the default model since this page has no model picker); both ChatGPT routes send 3 sentences before and after as context; "Comprehension controleren" opens ChatGPT asking for 7 questions about the video, each with the rough timestamp of the answer and 1–3 new/difficult words from the transcript to use in my answer, with the `.srt`'s normal Drive share link in the prompt instead of the transcript itself (`listeningComprehensionPrompt`, `driveShareUrl`) (`sentencesAroundCues` in `app/lib/srt.ts` rebuilds real sentences, since cues stop mid-sentence), and the cues are also shown as subtitles on the video (a native `addTextTrack` track, so they stay in fullscreen; "Ondertitels aan/uit" toggles it, styled via `video::cue` in `globals.css`) |
| `app/hooks/useListeningTree.ts` + `app/components/ListeningTree.tsx` | Luisteren tab's Drive tree: loads `/api/luisteren/tree` once, renders collapsible folders (`<details>`) with each .mp3/.mp4 linking to the player page, and marks files without a same-name `.srt` as "geen ondertitels" |
| `app/components/ArtikelenTab.tsx` | Artikelen tab: folder browser + article reader |
| `app/components/AddPhraseForm.tsx` | Add-phrase form (phrase, meanings, tags) driven by `useWords`; used inline in Fraselijst and in `AddPhraseModal` |
| `app/components/AddPhraseModal.tsx` | Modal around `AddPhraseForm` (`role="dialog" aria-modal`), opened from the "+ Fraselijst" selection button in Artikelen and on the Luisteren player page, and from Luisteren's noted phrases; optional `onAdded` fires only when the phrase was actually saved |
| `app/hooks/useAddPhraseModal.ts` | Open/close state for `AddPhraseModal` prefilled with a phrase (`openWith(text)` loads the phrase list and calls `startAddWord`), shared by Artikelen and the player page |
| `app/lib/keyboard.ts` | `isTypingTarget` (key went to a text field) and `isModalOpen` (an `aria-modal` dialog is open), used to keep page shortcuts out of the way (Cloze cards, the Luisteren player) |
| `app/lib/chatgpt.ts` | Builds a ChatGPT explain-this-phrase URL for the "Open in ChatGPT" links; `openChatGptWithPromptAsync` opens a prompt via `?q=` when the URL stays under ~30 KB, otherwise via the clipboard (chatgpt.com loaded a 64 KB URL but not a 125 KB one); `driveShareUrl` gives a Drive file's normal share link (`/file/d/<id>/view?usp=sharing`), which ChatGPT asked for after it couldn't open the `uc?export=download` link |
| `app/lib/popup.ts` | `openPopupWindow` (sized, positioned `window.open` popup, used by ChatGPT links and Luisteren videos) and `oppositeHalfOfScreen` (half the screen, on the side the app window isn't on) |
| `app/lib/drivePictureStore.ts` + `app/lib/pictures.ts` | Phrase pictures: a phrase's optional `picture` field is the Drive file id of an image in `googlePicturesFolder`. `listPicturesAsync` lists the folder; `pictureUrl` builds the `/api/pictures/<id>` URL; `findPictureForPhrase` finds an image named after the phrase (`fiets.png` for "fiets") to suggest; phrases and meanings can be whole sentences, so names are compared on letters and digits only (`matchKey`: `hoe gaat het.png` matches "Hoe gaat het?"), and only a real image extension is stripped |
| `app/hooks/usePictures.ts` + `app/components/PicturePicker.tsx` + `app/components/PhrasePicture.tsx` | Picture dropdown in `PhraseDetailModal` (with a "Gebruik <naam>" suggestion and a preview; logged out it only shows the saved picture), saved via `useWords`'s `editPicture` (`null` removes it); `PhrasePicture` hides itself when the image fails to load. Cloze kaarten show the picture on the meaning side of the card (back normally, front when reversed); Cloze typen shows the picture of that sentence's meaning once the answer is checked. Every meaning without a picture (Cloze kaarten/typen, `PhraseDetailModal`) shows "Geen afbeelding beschikbaar" instead, also when the image fails to load (`MeaningPicture` in `PhrasePicture.tsx`, lookup in `findMeaningPictureId`) |
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
- `database.googleArticlesFolder.folderId` — Drive folder (subfolders allowed) holding
  articles as Google Docs or `.txt` files, readable by the same service account. Enables
  the Artikelen tab; if unset, `/api/articles` returns a "not configured" error.
- `database.googleListeningFolder.folderId` — Drive folder (subfolders allowed) holding
  .mp3/.mp4 files, each with a `.srt` of the same name next to it, readable by the same
  service account. Enables the Luisteren tab's Drive tree; if unset, `/api/luisteren/tree`
  returns a "not configured" error.
- `database.googlePicturesFolder.folderId` — Drive folder holding the phrase pictures,
  readable by the same service account. Pictures are uploaded there by hand (the service
  account can't create files); if unset, `/api/pictures` returns a "not configured" error.
- `database.googleMistakesFile.fileId` — a `.tsv` file (not a Google Sheet) holding my mistakes,
  which the service account must be able to **edit** (it writes `noOfTimesPracticed` back).
  Enables the Fouten tab; if unset, `/api/mistakes` returns a "not configured" error.

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
  default `/api/auth/error` page. `HomeClient.tsx` reads that `error` query param on mount (and a `tab` param, e.g. `/?tab=luisteren`, to open that tab),
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
| **Artikelen** | Browse a Drive folder of articles (Google Docs / `.txt`, subfolders navigable via a breadcrumb), read one, click "Comprehension controleren" (below the article) to open ChatGPT with the whole article and a request for 7 comprehension questions, each with the rough paragraph that holds the answer and 1–3 new/difficult words from the text to use in my answer, and select text to open a ChatGPT explanation (the whole article is sent along as context) or add it to the Fraselijst via a modal (`AddPhraseModal`, prefilled through `useWords`'s `startAddWord`); login required |
| **Cloze** | Fill-in-the-blank on Fraselijst example sentences. Two separate sessions: "Start typen" (type the word, letter hints) and "Start kaarten" (Anki-style card: phrase on the front, click/Space flips it to its meanings, then self-mark Goed/Fout with 1/2; any phrase with a meaning qualifies), with both frase → vertaling and vertaling → frase shuffled together in one session. Each has its own daily counter (`cloze` / `clozekaarten`). "Start gemengd" mixes typen questions and kaarten cards in one session |
| **Luisteren** | Shows a daily goal (listen at least 5 minutes a day). A Drive tree (`googleListeningFolder`) lists the .mp3/.mp4 files; clicking one opens the player page with its same-name `.srt` as a synced transcript. Save YouTube links (stored on Drive, so they sync across devices) and click one to open the video, starting where you left off if you filled that in; note words/phrases per video and import them into the Fraselijst; login required |
| **Vertaling oefenen** | Translation practice on my own mistakes from a `.tsv` on Drive, to express myself more clearly: translate the English sentence into Dutch, check it against the possible translation or ask ChatGPT, and mark it Goed to add 1 to its `noOfTimesPracticed`; own daily counter (`fouten`); login required |
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
