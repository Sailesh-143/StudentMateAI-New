
const express = require("express");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const path = require("path");

dotenv.config();

const app = express();
app.use(express.json({ limit: "20kb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/ask", async (req, res) => {
  try {
    const question = String(req.body.question || "").trim();
    const subject = String(req.body.subject || "General").slice(0, 100);

    if (!question) {
      return res.status(400).json({
        error: "Please enter a question."
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `You are a friendly study tutor.
Explain clearly for a school student.
Subject: ${subject}
Question: ${question}`
    });

    res.json({
      answer: response.text || "No answer received. Try again."
    });
  } catch (error) {
    console.error("AI request failed:", error.message);
    res.status(500).json({
      error: "AI request failed. Check the CMD window for details."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`StudentMate AI running at http://localhost:${PORT}`);
});
