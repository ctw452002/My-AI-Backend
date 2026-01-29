import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- GLOBAL MEMORY ---
let botSettings = {
  isStopped: false,
  knowledgeBase: "You are a helpful AI assistant for customer service.",
  startHour: 0,
  endHour: 23,
  quickChips: ["Pricing", "Location", "Contact Us"] 
};

let chatHistory = [];

app.get("/settings", (req, res) => res.json(botSettings));

app.post("/settings", (req, res) => {
  botSettings = { ...botSettings, ...req.body };
  res.json({ success: true, settings: botSettings });
});

app.get("/history", (req, res) => res.json(chatHistory));

app.post("/chat", async (req, res) => {
  try {
    if (botSettings.isStopped) {
      return res.json({ reply: "The AI is currently paused by the admin." });
    }

    const currentHour = new Date().getHours();
    if (currentHour < botSettings.startHour || currentHour > botSettings.endHour) {
      return res.json({ reply: `I'm currently off-duty. Hours: ${botSettings.startHour}:00 - ${botSettings.endHour}:00.` });
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

    const reply = completion.choices[0].message.content;

    chatHistory.unshift({ user: userMessage, bot: reply, time: new Date().toLocaleTimeString() });
    if (chatHistory.length > 30) chatHistory.pop();

    res.json({ reply });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ reply: "❌ Quota Exceeded." });
    }
    res.status(500).json({ reply: "❌ AI server error." });
  }
});

app.get("/status", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
