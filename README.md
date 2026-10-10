# AccessLens — AI Accessibility Assistant (Prototype)

AccessLens is a laptop-ready prototype with three support modes:
- **Scene support**: explains a scene in clear, calm language and suggests practical next steps.
- **Focus support**: turns an overwhelming task into one small next action.
- **Memory support**: organizes user-provided context into a short reminder and next step.

It supports typed prompts, optional context, image upload, browser speech-to-text (if available), and read-aloud output. AI responses are generated through Google's Gemini API. The API key stays on the backend.

## Requirements
- Node.js LTS (18+ recommended; 20+ is a good choice)
- A Google Gemini API key from https://aistudio.google.com/app/apikey
- Internet access for Gemini requests

## 1. Set up the backend

Open a terminal in the `backend` folder:

```bash
npm install
```

Copy `.env.example` to `.env`, then edit `.env` and add your key:

```env
GEMINI_API_KEY=PASTE_YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash
PORT=5000
```

Start the backend:

```bash
npm run dev
```

Open http://localhost:5000/api/health. You should see `ok: true`. `configured` should be `true` once the key is set.

**Never share your API key or put it in frontend code / a `VITE_...` variable. Do not upload `.env` to GitHub.**

## 2. Set up the frontend

Open a second terminal in the `frontend` folder:

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually http://localhost:5173).

## 3. Try the prototype

1. Select a mode: Scene support, Focus support, or Memory support.
2. Enter a prompt. You can add context and optionally attach a photo.
3. Press **Get guidance**.
4. Use **Read aloud** to hear the response. The microphone button uses browser speech recognition where supported.

Example prompts:
- Scene: `I'm in a crowded hospital reception. Explain what might be happening and suggest one next step.`
- Focus: `I have to prepare a presentation and I'm overwhelmed. Help me start.`
- Memory: `I need to remember to submit my lab file tomorrow, bring my ID card, and call my teammate.`

## Troubleshooting
- **`configured: false`**: check that `backend/.env` exists and contains `GEMINI_API_KEY=...`, then restart the backend.
- **Port already in use**: change `PORT=5001` in `backend/.env` and set `VITE_API_BASE=http://localhost:5001` in `frontend/.env`.
- **Model error**: change `GEMINI_MODEL` to a model available to your account in Google AI Studio.
- **CORS error**: run the frontend at the default Vite URL (`http://localhost:5173`). Restart the backend after changing environment variables.
- **Speech input not available**: use Chrome or Edge and type the prompt instead.
- **No photo response**: use a JPG, PNG, or WebP image under 8 MB.

## Prototype boundaries
AccessLens is a supportive prototype, not a diagnostic or emergency service. It can make mistakes, may misinterpret images, and should not be relied on for medical, legal, safety-critical, or emergency decisions. It does not contact anyone automatically. Do not upload sensitive images or private information you do not have permission to share.
