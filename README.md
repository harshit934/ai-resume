# AI Resume Analyzer

Upload a PDF resume and compare it with a job description. The Express backend extracts PDF text and sends the analysis to either local Ollama or the Gemini API. The Gemini API key is used only by the backend.

## Requirements

- Node.js 18 or newer
- Ollama for local AI analysis, or a Gemini API key for hosted analysis

## Install

From the project root, install each package:

```powershell
Push-Location server; npm install; Pop-Location
Push-Location client; npm install; Pop-Location
Copy-Item .env.example .env
```

For local Ollama, set `AI_PROVIDER=ollama` in `.env`, start Ollama, and pull the configured model:

```powershell
ollama pull qwen2.5-coder:3b
```

For Gemini, set `AI_PROVIDER=gemini` and add your key to `GEMINI_API_KEY` in the root `.env` file. Never add this key to the client environment or frontend source.

## Run Locally

Start the backend in one PowerShell terminal:

```powershell
Push-Location server; npm run dev
```

Start the frontend in a second terminal:

```powershell
Push-Location client; npm run dev
```

Open `http://localhost:5173`. Leave `VITE_API_URL` blank for local development; Vite proxies `/api` to the backend at `http://127.0.0.1:3001`.

## Build

From the project root:

```powershell
Push-Location client; npm run build; Pop-Location
```

The production files are written to `client/dist`.

## Deploy

### Render Backend

Create a Render Web Service for the repository with:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

Configure these Render environment variables:

- `AI_PROVIDER`: `gemini`
- `GEMINI_API_KEY`: your Gemini API key, stored as a Render secret
- `GEMINI_MODEL`: `gemini-2.5-flash` (or another model enabled for your key)
- `CORS_ORIGINS`: your Vercel production origin, for example `https://your-app.vercel.app`; add any preview origins as comma-separated values if needed

Render supplies `PORT`. `OLLAMA_URL` and `OLLAMA_MODEL` are only needed when `AI_PROVIDER=ollama`.

### Vercel Frontend

Create a Vercel project for the same repository with:

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`

Set this Vercel environment variable for Production (and Preview if used):

- `VITE_API_URL`: the Render backend origin, such as `https://your-api.onrender.com`, with no trailing slash and no `/api` suffix

Do not configure `GEMINI_API_KEY` in Vercel. The frontend sends requests to the backend URL; the backend alone calls Gemini.

## Environment Variables

| Variable | Purpose | Example/default |
| --- | --- | --- |
| `AI_PROVIDER` | Backend AI provider | `gemini` for Render; `ollama` locally |
| `GEMINI_API_KEY` | Backend-only Gemini credential | Empty in `.env.example` |
| `GEMINI_MODEL` | Gemini model | `gemini-2.5-flash` |
| `OLLAMA_URL` | Local Ollama server | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Local Ollama model | `qwen2.5-coder:3b` |
| `PORT` | Express port | `3001` locally; supplied by Render |
| `CORS_ORIGINS` | Comma-separated allowed browser origins | `http://localhost:5173` locally |
| `VITE_API_URL` | Public backend origin used by the frontend | Empty locally; Render service URL on Vercel |

## API

- `POST /api/parse-pdf`: accepts a `resume` PDF field and returns extracted text and page count.
- `POST /api/analyze`: accepts `resumeText` and `jobDescription`; returns the normalized analysis fields.
- `GET /api/health`: reports provider configuration and checks Ollama reachability when Ollama is selected.

PDF parsing remains on the backend. Scanned image PDFs may not contain extractable text.