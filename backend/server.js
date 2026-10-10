import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = Number(process.env.PORT || 5000);
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const apiKey = process.env.GEMINI_API_KEY;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",").map((item) => item.trim())
    : "http://localhost:5173"
}));
app.use(express.json({ limit: "12mb" }));

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "AccessLens API",
    configured: Boolean(apiKey),
    model
  });
});

const modeInstructions = {
  scene: `MODE: SCENE SUPPORT
Explain the visible or described situation in calm, concrete, non-judgmental language.
Separate what is directly visible/stated from what is uncertain. Never claim to know a person's feelings, diagnosis, intentions, or identity from appearance.
Use short sections: "What may be happening", "What you can do next", and "If this feels overwhelming".
Offer one practical next step first. If an image is attached, describe only what can reasonably be seen.`,
  focus: `MODE: FOCUS SUPPORT
Help the user get unstuck without judgment. Briefly acknowledge the task, break it into tiny steps, then make ONE clearly marked "Your next action" that takes about 2–5 minutes. Avoid a long list and motivational clichés. Ask at most one clarifying question only if absolutely needed.`,
  memory: `MODE: MEMORY SUPPORT
Use only the information the user supplied in the prompt/context/image. Organize it into a concise reminder with "Remember", "Next action", and "Helpful checklist" sections. Do not invent dates, facts, commitments, or personal history. If a date/time is unclear, say so rather than guessing.`
};

function cleanText(value, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

app.post("/api/assist", async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: "Gemini is not configured. Add GEMINI_API_KEY to backend/.env and restart the backend."
      });
    }

    const mode = ["scene", "focus", "memory"].includes(req.body?.mode)
      ? req.body.mode
      : "scene";
    const text = cleanText(req.body?.text);
    const context = cleanText(req.body?.context, 2500);
    const imageBase64 = typeof req.body?.imageBase64 === "string"
      ? req.body.imageBase64.replace(/^data:[^;]+;base64,/, "")
      : "";
    const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType : "";

    if (!text && !context && !imageBase64) {
      return res.status(400).json({ error: "Please enter a prompt, add context, or attach an image." });
    }
    if (imageBase64 && !["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      return res.status(400).json({ error: "Please use a JPG, PNG, or WebP image." });
    }
    if (imageBase64.length > 10_500_000) {
      return res.status(413).json({ error: "That image is too large. Please choose an image under 8 MB." });
    }

    const prompt = `You are AccessLens, a supportive accessibility assistant. Your goal is to make information easier to understand and act on.
Be respectful, clear, practical, and concise. Use everyday language and short paragraphs. Do not diagnose a condition or imply that the user has one. Do not pretend to remember information outside this request. Never contact other people or claim to perform actions outside this chat.
${modeInstructions[mode]}

User request:
${text || "(No separate prompt provided.)"}

Additional context supplied by the user:
${context || "(None supplied.)"}

Please answer in a way that is useful immediately. If important details are uncertain, say what is uncertain.`;

    const parts = [{ text: prompt }];
    if (imageBase64) {
      parts.push({ inlineData: { mimeType, data: imageBase64 } });
    }

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }]
    });
    const answer = response.text?.trim();
    if (!answer) {
      return res.status(502).json({ error: "The AI returned an empty response. Please try again." });
    }
    res.json({ answer, mode, model });
  } catch (error) {
    console.error("AccessLens request failed:", error?.message || error);
    const message = String(error?.message || "");
    if (/API_KEY_INVALID|invalid api key|API key not valid/i.test(message)) {
      return res.status(401).json({ error: "Gemini rejected the API key. Check GEMINI_API_KEY in backend/.env and restart the server." });
    }
    if (/quota|rate limit|resource_exhausted/i.test(message)) {
      return res.status(429).json({ error: "Gemini rate limit or quota reached. Check your Google AI Studio usage and try again later." });
    }
    res.status(500).json({
      error: "The AI request failed. Check the backend terminal. If it mentions the model, set GEMINI_MODEL to a model available in Google AI Studio."
    });
  }
});

app.listen(port, () => {
  console.log(`AccessLens API running at http://localhost:${port}`);
  console.log(`Gemini configured: ${Boolean(apiKey)} | Model: ${model}`);
});
