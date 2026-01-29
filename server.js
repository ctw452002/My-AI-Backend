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
  knowledgeBase: "You are 天维, a professional executive assistant. Keep replies concise.",
  quickChips: ["Services", "Pricing", "Contact"]
};

let adminLogs = [];

app.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    const apiMessages = [
      { role: "system", content: botSettings.knowledgeBase },
      ...(history || []),
      { role: "user", content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      max_tokens: 400
    });

    const reply = completion.choices[0].message.content;

    // Log for the Admin Dashboard
    adminLogs.unshift({ 
      user: message, 
      bot: reply, 
      time: new Date().toLocaleTimeString() 
    });

    if (adminLogs.length > 50) adminLogs.pop();
    
    res.json({ reply });

  } catch (err) {
    console.error("Backend Error:", err);

    // --- THE FIX IS HERE ---
    // We check if the error is specifically about the Quota/Billing
    if (err.status === 429 || (err.message && err.message.includes("quota"))) {
        res.status(429).json({ reply: "❌ Error: API Quota Exceeded." });
    } else {
        // Otherwise, show the generic connection error
        res.status(500).json({ reply: "❌ Connection error. Please try again." });
    }
  }
});

app.get("/settings", (req, res) => res.json(botSettings));
app.get("/history", (req, res) => res.json(adminLogs));

app.post("/settings", (req, res) => {
  botSettings = { ...botSettings, ...req.body };
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Active on port ${PORT}`));
