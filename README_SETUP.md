# MediLense Person 2 Backend Setup

This folder contains your existing frontend renamed to **MediLense**, plus the local backend for the real AI demo.

## Files Person 2 added

- `server.js` — local Node/Express backend
- `package.json` — project dependencies and start command
- `.env.example` — copy this to `.env`
- `data/approvedContent.js` — approved medical content library
- patched `script.js` — browser calls `/api/generate` and `/api/chat` instead of calling AI directly

## Setup

1. Open backend folder in VS Code.
2. Open the terminal in this folder.
3. Run:

```bash
npm install
```

4. Copy `.env.example` to a new file named `.env`.
5. Put your Gemini API key, Gemini Model, Port inside `.env`:

```env
PORT=your-port-here
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=your-model-here
```

6. Start the app:

```bash
npm start
```

7. Open:

```text
http://localhost:3000
```

## Demo topics

Use one of these exact topics for the safest demo:

- cardiac cycle
- diabetes basics
- respiratory system

## What to say in the presentation

"Unlike a normal chatbot, MediLense does not let the AI search the open internet. Our backend first checks a local approved medical content library. The AI only receives that approved source text and transforms it into the selected learning style."
