import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --- GLOBAL SETTINGS (The "Live Brain") ---
// Note: This stays in memory. If Render restarts, it resets to these defaults.
let botSettings = {
  isStopped: false,
  knowledgeBase: "You are a helpful AI assistant for small business customer service.",
  startHour: 0,
  endHour: 23
};

// --- SETTINGS ROUTES ---

// Get current settings
app.get("/settings", (req, res) => {
  res.json(botSettings);
});

// Update settings from Dashboard
app.post("/settings", (req, res) => {
  const { isStopped, knowledgeBase, startHour, endHour } = req.body;
  
  if (typeof isStopped !== 'undefined') botSettings.isStopped = isStopped;
  if (knowledgeBase) botSettings.knowledgeBase = knowledgeBase;
  if (typeof startHour !== 'undefined') botSettings.startHour = parseInt(startHour);
  if (typeof endHour !== 'undefined') botSettings.endHour = parseInt(endHour);

  console.log("Settings Updated:", botSettings);
  res.json({ success: true, settings: botSettings });
});

// --- AI Chat Route ---
app.post("/chat", async (req, res) => {
  try {
    // 1. Check Kill Switch
    if (botSettings.isStopped) {
      return res.json({ reply: "The AI Assistant is currently paused by the administrator." });
    }

    // 2. Check Schedule
    const currentHour = new Date().getHours();
    if (currentHour < botSettings.startHour || currentHour > botSettings.endHour) {
      return res.json({ reply: `I'm currently off-duty. My working hours are ${botSettings.startHour}:00 to ${botSettings.endHour}:00.` });
    }

    const userMessage = req.body.message;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: botSettings.knowledgeBase },
        { role: "user", content: userMessage }
      ],
      max_tokens: 300
    });

    res.json({ reply: completion.choices[0].message.content });

  } catch (err) {
    console.error("SERVER ERROR 👉", err);
    res.status(500).json({ reply: "❌ AI server error. Please try again later." });
  }
});

app.get("/status", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
