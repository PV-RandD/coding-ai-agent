## CODING-AI-AGENT

A cross‑platform Electron desktop app for generating, editing, and running small scripts with help from an AI assistant. The UI is built with React + Vite; an embedded Express server exposes simple APIs for script management and AI actions. Packaged with electron-builder for macOS, Windows, and Linux.

### Key features

- **Ask AI to generate scripts**: Describe what you want; the app creates a concise, runnable script plus a short explanation.
- **Edit and save**: Modify code in the editor and save changes back to disk.
- **Run scripts locally**: Execute scripts with common runtimes (Python/Node/Bash/etc.) and view stdout/stderr.
- **Transform with AI**: Ask the assistant to refactor or change the currently open file.
- **Search your scripts**: Quick search across names, tags, and code previews.
- **Storage folder control**: Choose where scripts and the index are stored on your machine.

---

## Getting started

### Prerequisites

- Node.js 18+ and npm
- Optional: Local runtimes for languages you plan to run (e.g., Python, Node.js, Bash)

### Install dependencies

- Root dependencies:

```bash
npm install
```

- Renderer dependencies:

```bash
cd renderer && npm install
```

### Development

Start the React dev server and Electron together:

```bash
npm run dev
```

This runs:

- `renderer`: Vite dev server at `http://localhost:5173`
- `electron`: Electron with live reload, waiting for the renderer

### Build a production app

```bash
npm run build
```

This will:

- Build the renderer UI
- Package the Electron app with electron‑builder into `dist/`

Artifacts will be generated per platform (e.g., macOS `.dmg`, Windows `nsis`, Linux `AppImage`). App icons are in `assets/`.

---

## Configuration

### Environment variables

Set these in a `.env` file at the project root or in your shell.

- `OPENAI_API_KEY`: Default API key used by the embedded server. Optional if you prefer setting a key in the app UI.
- `OPENAI_MODEL`: Optional, defaults to `gpt-4o-mini`.
- `PORT`: Optional, Express server port (defaults to `8787`).

### In‑app OpenAI key

From the app settings, you can provide an OpenAI key that is sent as `x-openai-key` for requests to override the server default. The key is stored in `localStorage` under `OPENAI_KEY`.

---

## Project structure

```
llm-desktop-app/
  assets/            # App icons for packaging
  renderer/          # React + Vite UI
  server/            # Embedded Express API (started by Electron)
  main.js            # Electron main process (window + IPC + API bootstrap)
  preload.js         # Safe renderer bridge (IPC helpers)
  package.json       # Scripts for dev/build/packaging
```

Notable renderer components:

- `Sidebar` — shows scripts and search
- `AskToolbar` — prompt to generate a new script
- `EditorPane` — code editor for the selected script
- `AssistantPane` — AI chat to transform current code
- `TerminalPane` — output of script runs and a simple terminal input

---

## How it works

### Electron main (`main.js`)

- Creates the browser window and loads the Vite dev server (dev) or built UI (prod)
- Exposes IPC handlers via `preload.js` for:
  - `run-command`, `list-dir`, `read-preview`, `save-file`
  - `index-dir`, `search-index`
  - `select-storage-dir`, `get-storage-dir`
- Boots the embedded Express API server (`server/api.js`) on port `8787`

### Embedded API (`server/`)

- `api.js`: Express app with CORS and JSON parsing. Mounts:

  - `GET /api/search` — ranked search across stored scripts with code/explanation previews
  - `routes/scripts.js` — CRUD + run
  - `routes/ai.js` — code transform endpoint

- `routes/scripts.js`:

  - `POST /api/scripts` — Ask AI to generate `{ name, code, explanation }`, save to storage, return metadata
  - `GET /api/scripts` — list scripts
  - `GET /api/scripts/:id` — read script + metadata
  - `PUT /api/scripts/:id` — save updated code
  - `POST /api/scripts/:id/run` — execute by file extension (python/node/bash/etc.), return stdout/stderr and hints

- `routes/ai.js`:
  - `POST /api/ai/transform` — apply a textual change request to the current file; returns `{ code, explanation }`

Both routers accept `x-openai-key` to override the server’s default key.

### Renderer (`renderer/`)

- Built with React 19 + Vite 7 and Tailwind 4
- Talks to the API via `renderer/src/lib/api.js`
- Shows your selected storage directory at the top bar

---

## Selecting a storage folder

1. Open the app
2. Click to select a storage directory from the sidebar
3. New scripts and the index will be saved under that folder

The app reads/writes files directly to your chosen directory and maintains a small JSON index for metadata.

---

## Running scripts

The app chooses a run command based on file extension:

- `.py` → `python3 file.py`
- `.sh` → `bash file.sh`
- `.js` → `node file.js`
- `.ts` → `npx ts-node --transpile-only file.ts`
- `.rb`, `.php`, `.go`, `.java`, `.kt`, `.swift`, `.ps1`, `.pl`, `.rs` → appropriate commands

Make sure the corresponding runtime is installed and on your `PATH`.

---

## Troubleshooting

- **No storage selected**: Choose a folder first; generation and saving require it.
- **Model/API errors**: Ensure a valid OpenAI key via `.env` or the app settings.
- **Command not found** when running a script: Install the required runtime (Python, Node.js, etc.).
- **Permission denied**: On Unix-like systems, make files executable or run with proper permissions.
- **Syntax errors**: Check the code and fix reported issues; try a smaller change request.

---

## Scripts

From `package.json` at the project root:

- `npm run dev` — run Vite (renderer) and Electron together
- `npm run build:ui` — build the React UI only
- `npm run build` — build UI and package the desktop app

Renderer package (`renderer/package.json`):

- `npm run dev` — Vite dev server
- `npm run build` — Vite production build

---

## License

ISC
