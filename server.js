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

// --- AI Chat Route ---
app.post("/chat", async (req, res) => {
  try {
    // We now extract both 'message' and 'context' (Knowledge Base) from the body
    const userMessage = req.body.message;
    const businessContext = req.body.context || "You are a helpful AI assistant for small business customer service.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        // The system role now uses the context provided by the Business Owner
        { role: "system", content: businessContext },
        { role: "user", content: userMessage }
      ],
      max_tokens: 300
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error("SERVER ERROR 👉", err);

    if (err.code === "insufficient_quota" || err.status === 429) {
      res.status(200).json({ reply: "❌ No API credit left. Please top up your OpenAI account." });
    } else {
      res.status(500).json({ reply: "❌ AI server error. Please try again later." });
    }
  }
});

// --- STATUS ROUTE (Used for Dashboard Latency Check) ---
app.get("/status", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Use process.env.PORT for live deployment (Render/Heroku)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
