# CLAUDE.md

Project instructions live in **[@AGENTS.md](./AGENTS.md)** — read it for architecture, key
files, configuration priority, and design decisions. That file is the canonical doc; keep it
(not this one) up to date.

## Commands

```bash
npm run dev     # Next.js dev server on http://localhost:3000 (frontend + API routes)
npm run build   # production build
npm start       # run the production build
npm test        # Vitest unit tests (single run)
npm run test:watch
```

Playwright is installed for e2e tests but has no npm script; invoke it directly.

## Notes

- Runtime config (API keys, Google Drive file ID, allowed email) comes from env vars or
  `app/config.json` — the latter is git-ignored; see `app/config.example.json`.
- Selectable AI models are defined in `app/config/models.ts`.
- Business logic lives in hooks (`app/hooks/useWords.ts`, `useAiChat.ts`,
  `usePhrasePractice.ts`, `useExercises.ts`); keep components thin.
