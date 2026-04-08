const { GoogleGenerativeAI } = require("@google/generative-ai");
const CoachMateChat = require("../models/CoachMateChat");

const COACH_MATE_SYSTEM_PROMPT = `
You are AI Coach, a supportive AI career companion for AI Interviewer.

Your goal is to help users with interview preparation, resume feedback, job targeting, and practice planning while naturally guiding them to the relevant AI Interviewer tools.

Crucial Routing Map (ONLY use these routes):
- Dashboard: [/dashboard](/dashboard)
- HR Interview Practice: [/interview/hr/record](/interview/hr/record)
- Session-based Interview: [/interview/session-interview](/interview/session-interview)
- Live Interview: [/interview/live](/interview/live)
- Resume View: [/resume-view](/resume-view)
- ATS Checker: [/resume/ats-check](/resume/ats-check)

Key Traits:
- Tone: Empathetic, calm, practical, and encouraging.
- Be clear and concise. Avoid hype, roleplay, and unnecessary emojis.
- Answer career questions directly and suggest an AI Interviewer tool only when it is genuinely relevant.
- If a user is worried about an interview, suggest practicing in the [HR Interview Room](/interview/hr/record).
- If a user mentions their resume, suggest the [ATS Checker](/resume/ats-check).

Style:
- Short, practical sentences.
- When asked for tips, provide 2-3 strong suggestions and then a short next step.

Context:
- AI Interviewer Tools: Interview Prep, Resume Workspace, specialized practice sessions.
`;

const normalizeMessage = (value = "") => String(value).replace(/\s+/g, " ").trim();

const getChatHistory = async (req, res) => {
  try {
    const chat = await CoachMateChat.findOne({ userId: req.user._id });
    if (!chat) {
      return res.status(200).json({ messages: [] });
    }

    return res.status(200).json(chat);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch chat history", error: error.message });
  }
};

const chatWithCoach = async (req, res) => {
  try {
    const normalizedMessage = normalizeMessage(req.body?.message);
    if (!normalizedMessage) {
      return res.status(400).json({ message: "Message is required" });
    }

    let chat = await CoachMateChat.findOne({ userId: req.user._id });
    if (!chat) {
      chat = new CoachMateChat({ userId: req.user._id, messages: [] });
    }

    const lastUserMessage = [...chat.messages].reverse().find((entry) => entry.role === "user");
    const lastModelMessage = [...chat.messages].reverse().find((entry) => entry.role === "model");

    if (
      lastUserMessage &&
      lastModelMessage &&
      normalizeMessage(lastUserMessage.content).toLowerCase() === normalizedMessage.toLowerCase() &&
      Date.now() - new Date(lastUserMessage.timestamp).getTime() < 15000
    ) {
      return res.status(200).json({
        reply: lastModelMessage.content,
        history: chat.messages,
        deduped: true,
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "AI API Key missing" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const userName = req.user?.name || "Candidate";
    const resumeLink = req.user?.resumeLink || null;

    let finalPrompt = `
${COACH_MATE_SYSTEM_PROMPT}

USER PERSONAL DATA:
- Candidate Name: ${userName}
- Candidate Resume Link: ${resumeLink || "Not uploaded"}

SPECIFIC INSTRUCTION FOR RESUME:
If the user asks for their resume, resume link, or where their file is, provide this link: ${resumeLink || "None available"}
Format the response like: "Here is your latest resume: [View Resume](${resumeLink || "#"})"

CONVERSATION CONTEXT (Last 10 messages):
`;

    chat.messages.slice(-10).forEach((msg) => {
      finalPrompt += `${msg.role === "user" ? "User" : "AI Coach"}: ${msg.content}\n`;
    });

    finalPrompt += `User: ${normalizedMessage}\nAI Coach: `;

    const generateWithRetry = async (prompt, retries = 3, delay = 2000) => {
      try {
        return await model.generateContent(prompt);
      } catch (error) {
        if (retries > 0 && (error.status === 429 || error.message?.includes("429"))) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return generateWithRetry(prompt, retries - 1, delay * 2);
        }
        throw error;
      }
    };

    const result = await generateWithRetry(finalPrompt);
    const responseText = result.response.text();

    chat.messages.push({ role: "user", content: normalizedMessage });
    chat.messages.push({ role: "model", content: responseText });
    await chat.save();

    return res.status(200).json({ reply: responseText, history: chat.messages });
  } catch (error) {
    return res.status(500).json({
      message: "AI Coach encountered an error. Please try again.",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

const resetChatHistory = async (req, res) => {
  try {
    await CoachMateChat.findOneAndDelete({ userId: req.user._id });
    return res.status(200).json({ message: "Chat history cleared successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to clear chat history", error: error.message });
  }
};

module.exports = { getChatHistory, chatWithCoach, resetChatHistory };
