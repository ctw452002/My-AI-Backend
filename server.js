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
  knowledgeBase: "You are 天维, a professional AI executive assistant. Keep replies concise.",
  quickChips: ["Services", "Pricing", "Contact"]
};

let adminLogs = [];

app.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    const apiMessages = [
      { role: "system", content: botSettings.knowledgeBase },
      ...(history || [])
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      max_tokens: 400
    });

    const reply = completion.choices[0].message.content;
    adminLogs.unshift({ user: message, bot: reply, time: new Date().toLocaleTimeString() });
    
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ reply: "Connection error." });
  }
});

app.get("/settings", (req, res) => res.json(botSettings));
app.get("/history", (req, res) => res.json(adminLogs));
app.post("/settings", (req, res) => {
  botSettings = { ...botSettings, ...req.body };
  res.json({ success: true });
});

app.listen(process.env.PORT || 3000, () => console.log("Server Active"));
