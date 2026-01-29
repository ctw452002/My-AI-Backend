import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let botSettings = {
  isStopped: false,
  knowledgeBase: "You are 天维, a professional AI executive assistant.",
  startHour: 0,
  endHour: 23,
  quickChips: ["Services", "Pricing", "Contact"]
};

// Dashboard log (for admin only)
let adminLogs = [];

app.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    // Build context: Knowledge Base + Sliced History
    const apiMessages = [
      { role: "system", content: botSettings.knowledgeBase },
      ...history
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      max_tokens: 400
    });

    const reply = completion.choices[0].message.content;

    // Update Admin Logs
    adminLogs.unshift({ user: message, bot: reply, time: new Date().toLocaleTimeString() });
    if (adminLogs.length > 50) adminLogs.pop();

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ reply: "I'm having trouble connecting to my brain. Try again?" });
  }
});

app.get("/settings", (req, res) => res.json(botSettings));
app.get("/history", (req, res) => res.json(adminLogs));

app.post("/settings", (req, res) => {
  botSettings = { ...botSettings, ...req.body };
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
