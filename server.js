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

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // cheapest small model
      messages: [
        { role: "system", content: "You are a helpful AI assistant for small business customer service." },
        { role: "user", content: userMessage }
      ],
      max_tokens: 300
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error("SERVER ERROR 👉", err);

    // If quota exceeded
    if (err.code === "insufficient_quota" || err.status === 429) {
      res.status(200).json({ reply: "❌ No API credit left. Please top up your OpenAI account." });
    } else {
      res.status(500).json({ reply: "❌ AI server error. Please try again later." });
    }
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
