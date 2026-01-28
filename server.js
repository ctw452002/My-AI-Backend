import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- GLOBAL MEMORY (Single Source of Truth) ---
let botSettings = {
  isStopped: false,
  knowledgeBase: "You are a helpful AI assistant for customer service.",
  startHour: 0,
  endHour: 23
};

let chatHistory = []; // Stores the most recent global chats

// --- SETTINGS ROUTES ---
app.get("/settings", (req, res) => res.json(botSettings));

app.post("/settings", (req, res) => {
  botSettings = { ...botSettings, ...req.body };
  res.json({ success: true, settings: botSettings });
});

// --- HISTORY ROUTE ---
app.get("/history", (req, res) => res.json(chatHistory));

// --- AI CHAT ROUTE ---
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    // 1. Check Global Kill Switch
    if (botSettings.isStopped) {
      return res.json({ reply: "The AI Assistant is currently paused by the administrator." });
    }

    // 2. Check Global Schedule
    const currentHour = new Date().getHours();
    if (currentHour < botSettings.startHour || currentHour > botSettings.endHour) {
      return res.json({ reply: `I'm currently off-duty. My working hours are ${botSettings.startHour}:00 to ${botSettings.endHour}:00.` });
    }

    // 3. AI Completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: botSettings.knowledgeBase },
        { role: "user", content: userMessage }
      ],
      max_tokens: 300
    });

    const reply = completion.choices[0].message.content;

    // 4. Save to Global History
    const logEntry = {
      user: userMessage,
      bot: reply,
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString()
    };
    chatHistory.unshift(logEntry);
    if (chatHistory.length > 30) chatHistory.pop(); // Keep last 30 messages

    res.json({ reply });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ reply: "❌ AI server error. Please try again later." });
  }
});

app.get("/status", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
