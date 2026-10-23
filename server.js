
const express = require("express");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const path = require("path");

dotenv.config();

const app = express();
app.use(express.json({ limit: "20kb" }));

if (!process.env.GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY is missing. Check your .env file.");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/ask", async (req, res) => {
  try {
    const subject = String(req.body.subject || "General")
      .slice(0, 100);

    let messages = [];

    // New chat format: previous messages + latest question
    if (Array.isArray(req.body.messages)) {
      messages = req.body.messages
        .slice(-20)
        .filter(
          (m) =>
            m &&
            ["user", "assistant"].includes(m.role) &&
            typeof m.text === "string" &&
            m.text.trim()
        )
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text.slice(0, 4000) }]
        }));
    } else {
      // Keep compatibility with the existing website
      const question = String(req.body.question || "").trim();

      if (question) {
        messages = [{
          role: "user",
          parts: [{ text: question }]
        }];
      }
    }

    if (messages.length === 0 ||
        messages[messages.length - 1].role !== "user") {
      return res.status(400).json({
        error: "Please enter a question."
      });
    }

   
    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: messages,
        config: {
          systemInstruction:
            "You are StudentMate AI, a friendly and patient study tutor. " +
            "Explain concepts clearly for school students. " +
            "Use step-by-step explanations when helpful. " +
            "Support the subject: " + subject + ". " +
            "Respect the language requested by the student."
        }
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("AI request timed out after 30 seconds.")),
          30000
        )
      )
    ]);


    res.json({
      answer: response.text || "No answer received. Try again."
    });
  } catch (error) {
    console.error("AI request failed:", {
  message: error.message,
  status: error.status,
  code: error.code
});
    res.status(500).json({
      error: "AI request failed. Please try again later."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`StudentMate AI running at http://localhost:${PORT}`);
});
