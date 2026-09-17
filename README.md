# Zeg Het Maar

A personal Dutch language learning app powered by AI. Built to scratch my own itch: a single place to save Dutch phrases, get AI translations and example sentences, and actively practice what I've learned.

See live at zeghetmaar.onrender.com
---

## What it does (up to 25 June 2026)

| Tab | Feature |
|-----|---------|
| **Fraselijst** | Personal phrase list — add, edit, delete entries with AI-generated translations and example sentences. Track mastery per phrase (1–2–3 scale). Mark favourites. Sort and paginate. |
| **Herschrijver** | Paste any Dutch text; the AI rewrites it at your chosen register. |
| **Engels → Nederlands** | AI translation with context-aware explanations. |
| **Extra Oefeningen** | Curated links to external Dutch practice resources. |
| **Quiz** | Flashcard self-check on sentences pulled from a Google Drive folder (login required). |

Additional UX touches: a text-selection popup that sends highlighted text straight to the AI, a practice/quiz modal for active recall, and a model switcher so you can compare outputs across providers.

---

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **NextAuth v5** — Google OAuth, single allowed-email guard
- **Google Drive API** — service-account auth, Drive file as a lightweight JSON store
- **OpenRouter** — unified API for multiple AI models (swap providers without code changes)
- **Vitest** + **Playwright** — unit and end-to-end tests

---

## Architecture notes

**Google Drive as a database.** The word list lives in a JSON file on Google Drive, read and written via a service account. No database to spin up, no migrations, no infra to maintain. Deliberately not scalable — and that's fine for a personal tool. The trade-off is documented openly in the setup guide below. This decision is also made since renting a database increases costs.

**Custom hooks over component state.** Business logic lives in `useWords`, `useAiChat`, `usePhrasePractice`, and `useExercises`. Components stay thin and are straightforward to test.

**AI model switching at runtime.** The model selector in the header swaps the OpenRouter model for all AI calls in the session. Useful for comparing response quality without redeploying.

**NextAuth host-header injection protection.** Production deployments set `AUTH_TRUST_HOST=true` and rely on the platform's edge proxy to sanitise the `Host` header before it reaches Next.js — ensuring the OAuth redirect URI can never be spoofed.

---

## Running locally

```bash
npm run dev   # http://localhost:3000
```

### 1 — Google Drive (word list storage)

1. Create a service account in [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**.
2. Download the JSON key file and store it outside the project (e.g. `~/secrets/zeghetmaar-sa.json`).
3. Enable the **Google Drive API** in the same project.
4. Create or upload a JSON array file in Google Drive and share it with the service account email (role: **Editor**). Copy the file ID from the URL.

### 2 — Google OAuth (login)

1. Create an OAuth 2.0 client in Google Cloud Console.
2. Add `http://localhost:3000/api/auth/callback/google` as an authorised redirect URI.
3. Generate a random `nextAuthSecret` (e.g. `openssl rand -base64 32`).

### 3 — Config

Create `app/config.json` (git-ignored):

```json
{
  "openrouterApiKey": "sk-or-...",
  "googleKeyFile": "/absolute/path/to/your-service-account.json",
  "googleDriveFileId": "YOUR_FILE_ID",
  "userCreds": {
    "authFile": "/absolute/path/to/userauth.cred.json"
  }
}
```

`userauth.cred.json`:

```json
{
  "googleClientId": "...",
  "googleClientSecret": "...",
  "nextAuthSecret": "...",
  "allowedEmail": "you@example.com"
}
```

Alternatively, set the equivalent environment variables — see the table below.

| Env var | Config key |
|---------|-----------|
| `GOOGLE_APPLICATION_CREDENTIALS` | `googleKeyFile` |
| `GOOGLE_DRIVE_FILE_ID` | `googleDriveFileId` |
| `USERCREDS_AUTHFILE` | `userCreds.authFile` |

### Troubleshooting

| Error | Likely cause |
|-------|-------------|
| `ENOENT` / `file not found` | `googleKeyFile` is a relative path — use the full absolute path |
| `invalid_grant` / `401` | Key file is an OAuth2 client credential, not a service account key |
| `403 The caller does not have permission` | Drive file not shared with the service account email |
| `404 File not found` | Wrong `googleDriveFileId`, or file not shared with the service account |

---

## Production

1. Add `https://your-domain.com/api/auth/callback/google` to your OAuth client's authorised redirect URIs.
2. Set `AUTH_TRUST_HOST=true` in your deployment environment.
