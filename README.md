# Zeg Het Maar

A web app for learning Dutch.

## Running the app

```bash
npm run dev   # http://localhost:3000
```

---

## Google Drive as database for word list

The word list is stored in a JSON file on Google Drive. This is to make things easy (no need to maintain separate databases, migrations, etc.), though I realize it's obviously not scalable :).

### How it works

The app uses the [Google APIs Node.js client](https://github.com/googleapis/google-api-nodejs-client#service-account-credentials) with a **service account** to authenticate. No browser pop-up, no token files — just a JSON key file that stays on your machine (and is git-ignored).

### Step 1 — Create a Google Cloud service account

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials**.
2. Click **Create credentials** → **Service account**.
3. Give it a name (e.g. `zeghetmaar-drive`) and click **Done**.
4. Open the service account → **Keys** tab → **Add key** → **Create new key** → **JSON**.
5. Save the downloaded file somewhere safe (e.g. `~/secrets/zeghetmaar-sa.json`).  
   **Do not put it inside the project folder unless you are sure it is git-ignored.**

> The file contains `"type": "service_account"` — this is what the app expects.

### Step 2 — Enable the Google Drive API

In the same Cloud project, go to **APIs & Services** → **Enabled APIs** → **Enable APIs and services** → search for **Google Drive API** → enable it.

### Step 3 — Prepare the Drive file

1. Upload (or create) a JSON file in your Google Drive — it must be a valid JSON array.
2. Open the file in Drive. The file ID is the long string in the URL:  
   `https://drive.google.com/file/d/`**`THIS_IS_THE_FILE_ID`**`/view`
3. Click **Share** → paste the service account email (looks like `name@project.iam.gserviceaccount.com`) → set role to **Editor** → click **Send**.

### Step 4 — Configure the app

Edit (or create) `app/config.json` based on `app/config.example.json`:

```json
{
  "openrouterApiKey": "sk-or-...",
  "model": "openai/gpt-4o-mini",
  "googleKeyFile": "/absolute/path/to/your-service-account.json",
  "googleDriveFileId": "YOUR_FILE_ID_FROM_STEP_3"
}
```

`app/config.json` is git-ignored. Alternatively, set environment variables:

| Env var                        | Equivalent config key   |
|-------------------------------|-------------------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | `googleKeyFile`       |
| `GOOGLE_DRIVE_FILE_ID`         | `googleDriveFileId`     |

> **Note:** `googleKeyFile` must be an **absolute path** (e.g. `/Users/you/secrets/sa.json`), not a filename relative to the project root.

### Step 5 — Run

```bash
npm run dev
```

All word list reads and writes will go to your Drive file.

### Troubleshooting

| Error | Likely cause |
|-------|-------------|
| `file not found` / `ENOENT` | `googleKeyFile` path is wrong or relative. Use the full absolute path. |
| `invalid_grant` / `401` | The key file is an OAuth2 client credential (not a service account). Re-download from the **Service Accounts** section. |
| `403 The caller does not have permission` | The Drive file has not been shared with the service account email. Repeat Step 3. |
| `404 File not found` | `googleDriveFileId` is wrong, or the file was not shared with the service account. |
