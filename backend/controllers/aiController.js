const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const {
  conceptExplainPrompt,
  questionAnswerPrompt,
  transcriptAnalysisPrompt,
  transcriptCleanupPrompt,
} = require("../utils/prompts");
const { parseResumeSnapshot } = require("../utils/resumeParser");

// Helper function for exponential backoff retry
const generateContentWithRetry = async (model, prompt, retries = 3, delay = 1000) => {
  try {
    return await model.generateContent(prompt);
  } catch (error) {
    if (retries > 0 && (error.status === 429 || error.message?.includes('429'))) {
      const msg = `[${new Date().toISOString()}] Hit rate limit. Retrying in ${delay}ms... (${retries} retries left)\n`;
      fs.appendFileSync(path.join(__dirname, '../error_log.txt'), msg);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateContentWithRetry(model, prompt, retries - 1, delay * 2);
    }
    const msg = `[${new Date().toISOString()}] API Error: ${error.message}\nStack: ${error.stack}\n`;
    fs.appendFileSync(path.join(__dirname, '../error_log.txt'), msg);
    throw error;
  }
};

// @desc    Generate interview questions and answers using Gemini
// @route   POST /api/ai/generate-questions
// @access  Private
const generateInterviewQuestions = async (req, res) => {
  try {
    const { role, experience, topicsToFocus, numberOfQuestions, resumeText, jobDescription, resumeData } = req.body;

    if ((!role || !experience || !topicsToFocus) && !resumeText) {
      return res.status(400).json({ message: "Missing required fields. Provide Role, Experience, and Topics OR a Resume." });
    }

    if (!numberOfQuestions) {
      return res.status(400).json({ message: "Missing numberOfQuestions" });
    }

    const prompt = questionAnswerPrompt(
      role,
      experience,
      topicsToFocus,
      numberOfQuestions,
      resumeText,
      jobDescription,
      resumeData || parseResumeSnapshot(resumeText || "")
    );

    // Create a new instance for each request to avoid any caching issues
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Generate content with error handling and retry logic
    const result = await generateContentWithRetry(model, prompt);

    if (!result || !result.response) {
      throw new Error("Invalid response from Gemini API");
    }

    const response = result.response;
    let rawText = response.text();

    // Clean it: Remove ```json and ``` from beginning and end, and handle extra content
    let cleanedText = rawText
      .replace(/^```json\s*/, "") // remove starting ```json
      .replace(/```.*$/, "") // remove ending ``` and anything after it
      .trim(); // remove extra spaces

    // Find the end of the JSON array/object and cut off any extra content
    let jsonEndIndex = -1;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < cleanedText.length; i++) {
      const char = cleanedText[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '[' || char === '{') {
          bracketCount++;
        } else if (char === ']' || char === '}') {
          bracketCount--;
          if (bracketCount === 0) {
            jsonEndIndex = i;
            break;
          }
        }
      }
    }

    if (jsonEndIndex > -1) {
      cleanedText = cleanedText.substring(0, jsonEndIndex + 1);
    }

    // Remove control characters except for valid whitespace
    cleanedText = cleanedText.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

    // Now safe to parse
    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (err) {
      return res.status(500).json({
        message: "Failed to parse AI response as JSON. Please try again or check the AI output formatting.",
      });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate questions",
    });
  }
};

// @desc    Generate explains a interview question
// @route   POST /api/ai/generate-explanation
// @access  Private
const generateConceptExplanation = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prompt = conceptExplainPrompt(question);

    // Create a new instance for each request to avoid any caching issues
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Generate content with retry logic
    const result = await generateContentWithRetry(model, prompt);
    const response = result.response;
    let rawText = response.text();

    // Clean it: Remove ```json and ``` from beginning and end, and handle extra content
    let cleanedText = rawText
      .replace(/^```json\s*/, "") // remove starting ```json
      .replace(/```.*$/, "") // remove ending ``` and anything after it
      .trim(); // remove extra spaces

    // Find the end of the JSON object and cut off any extra content
    let jsonEndIndex = -1;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < cleanedText.length; i++) {
      const char = cleanedText[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '[' || char === '{') {
          bracketCount++;
        } else if (char === ']' || char === '}') {
          bracketCount--;
          if (bracketCount === 0) {
            jsonEndIndex = i;
            break;
          }
        }
      }
    }

    if (jsonEndIndex > -1) {
      cleanedText = cleanedText.substring(0, jsonEndIndex + 1);
    }

    // Remove control characters except for valid whitespace
    cleanedText = cleanedText.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

    // Now safe to parse
    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (err) {
      return res.status(500).json({
        message: "Failed to parse AI explanation as JSON. Please try again or check the AI output formatting.",
      });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate explanation",
    });
  }
};

// @desc    Analyze and refine interview transcript
// @route   POST /api/ai/analyze-transcript
// @access  Private
const analyzeTranscript = async (req, res) => {
  try {
    const { question, transcript } = req.body;

    if (!question || !transcript) {
      return res.status(400).json({ message: "Missing required fields: question and transcript" });
    }

    if (transcript.trim().length < 10) {
      return res.status(400).json({ message: "Transcript too short for meaningful analysis" });
    }

    const prompt = transcriptAnalysisPrompt(question, transcript);

    // Create a new instance for each request to avoid any caching issues
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Generate content with error handling and retry logic
    const result = await generateContentWithRetry(model, prompt);

    if (!result || !result.response) {
      throw new Error("Invalid response from Gemini API");
    }

    const response = result.response;
    let rawText = response.text();

    // Clean it: Remove ```json and ``` from beginning and end, and handle extra content
    let cleanedText = rawText
      .replace(/^```json\s*/, "") // remove starting ```json
      .replace(/```.*$/, "") // remove ending ``` and anything after it
      .trim(); // remove extra spaces

    // Find the end of the JSON object and cut off any extra content
    let jsonEndIndex = -1;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < cleanedText.length; i++) {
      const char = cleanedText[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '[' || char === '{') {
          bracketCount++;
        } else if (char === ']' || char === '}') {
          bracketCount--;
          if (bracketCount === 0) {
            jsonEndIndex = i;
            break;
          }
        }
      }
    }

    if (jsonEndIndex > -1) {
      cleanedText = cleanedText.substring(0, jsonEndIndex + 1);
    }

    // Now safe to parse
    const data = JSON.parse(cleanedText);

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      message: "Failed to analyze transcript",
    });
  }
};

// @desc    Clean and improve transcript using AI
// @route   POST /api/ai/cleanup-transcript
// @access  Private
const cleanupTranscript = async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ message: "Missing required field: transcript" });
    }

    if (transcript.trim().length < 5) {
      return res.status(400).json({ message: "Transcript too short for cleanup" });
    }

    const prompt = transcriptCleanupPrompt(transcript);

    // Create a new instance for each request to avoid any caching issues
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Generate content with error handling and retry logic
    const result = await generateContentWithRetry(model, prompt);

    if (!result || !result.response) {
      throw new Error("Invalid response from Gemini API");
    }

    const response = result.response;
    let rawText = response.text();

    // Clean it: Remove ```json and ``` from beginning and end, and handle extra content
    let cleanedText = rawText
      .replace(/^```json\s*/, "") // remove starting ```json
      .replace(/```.*$/, "") // remove ending ``` and anything after it
      .trim(); // remove extra spaces

    // Find the end of the JSON object and cut off any extra content
    let jsonEndIndex = -1;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < cleanedText.length; i++) {
      const char = cleanedText[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '[' || char === '{') {
          bracketCount++;
        } else if (char === ']' || char === '}') {
          bracketCount--;
          if (bracketCount === 0) {
            jsonEndIndex = i;
            break;
          }
        }
      }
    }

    if (jsonEndIndex > -1) {
      cleanedText = cleanedText.substring(0, jsonEndIndex + 1);
    }

    // Now safe to parse
    const data = JSON.parse(cleanedText);

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      message: "Failed to cleanup transcript",
    });
  }
};

// @desc    Generate PDF report data
// @route   POST /api/ai/generate-pdf-data
// @access  Private
const generatePDFData = async (req, res) => {
  try {
    const { analysis, question, transcript, userInfo } = req.body;

    if (!analysis || !question || !transcript) {
      return res.status(400).json({ message: "Missing required fields: analysis, question, transcript" });
    }

    // Prepare structured data for PDF generation
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const wordCount = transcript.split(' ').length;
    const strengthsCount = analysis.strengths?.length || 0;
    const improvementsCount = analysis.improvements?.length || 0;
    const takeawaysCount = analysis.keyTakeaways?.length || 0;
    const clampMetric = (value) => Math.max(0, Math.min(10, Number(value.toFixed(1))));

    const pdfData = {
      metadata: {
        title: "Interview Analysis Report",
        generatedDate: currentDate,
        candidate: userInfo?.name || "Anonymous",
        role: userInfo?.role || "N/A",
        sessionId: Date.now().toString()
      },
      interview: {
        question: question,
        transcript: transcript,
        wordCount,
        estimatedDuration: Math.ceil(wordCount / 150) // 150 words per minute average
      },
      analysis: {
        overallScore: analysis.score,
        grade: getScoreGrade(analysis.score),
        performance: getScoreLabel(analysis.score),
        refinedAnswer: analysis.refinedAnswer,
        strengths: analysis.strengths || [],
        improvements: analysis.improvements || [],
        keyTakeaways: analysis.keyTakeaways || [],
        overallFeedback: analysis.overallFeedback
      },
      metrics: {
        clarity: clampMetric(analysis.score + (strengthsCount >= 2 ? 0.6 : 0.2) - improvementsCount * 0.15),
        structure: clampMetric(analysis.score + takeawaysCount * 0.25 - improvementsCount * 0.1),
        confidence: clampMetric(analysis.score + (wordCount >= 90 ? 0.5 : wordCount >= 45 ? 0.2 : -0.3)),
        relevance: clampMetric(analysis.score + (analysis.refinedAnswer ? 0.35 : 0) - improvementsCount * 0.08)
      }
    };

    function getScoreGrade(score) {
      if (score >= 9) return 'A+';
      if (score >= 8) return 'A';
      if (score >= 7) return 'B+';
      if (score >= 6) return 'B';
      if (score >= 5) return 'C+';
      if (score >= 4) return 'C';
      return 'D';
    }

    function getScoreLabel(score) {
      if (score >= 8) return 'Excellent';
      if (score >= 6) return 'Good';
      if (score >= 4) return 'Fair';
      return 'Needs Improvement';
    }

    res.status(200).json({
      success: true,
      data: pdfData
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate PDF data",
    });
  }
};

module.exports = { generateInterviewQuestions, generateConceptExplanation, analyzeTranscript, cleanupTranscript, generatePDFData };
