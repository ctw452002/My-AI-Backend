import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ... existing imports ...

let botSettings = {
  isStopped: false,
  showChips: true, // NEW: The master toggle for quick replies
  knowledgeBase: "You are 天维, a professional executive assistant...",
  quickChips: ["Services", "Pricing", "Contact"],
  startHour: 0,
  endHour: 23
};

// ... existing chat and settings routes ...
let adminLogs = [];

app.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    // 1. CHECK MASTER KILL SWITCH
    if (botSettings.isStopped) {
      return res.json({ reply: "⏸️ Service is currently paused by the administrator." });
    }

    // 2. CHECK OPERATING HOURS
    const currentHour = new Date().getHours(); 
    if (currentHour < botSettings.startHour || currentHour > botSettings.endHour) {
      return res.json({ 
        reply: `🌙 We are currently off-duty. Operating hours are ${botSettings.startHour}:00 to ${botSettings.endHour}:00.` 
      });
    }

    // 3. PROCEED TO AI IF CHECKS PASS
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

    if (err.status === 429 || (err.message && err.message.includes("quota"))) {
        res.status(429).json({ reply: "❌ Error: API Quota Exceeded." });
    } else {
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
