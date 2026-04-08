const InterviewAttempt = require("../models/InterviewAttempt");
const path = require("path");

const createAttempt = async (req, res) => {
  try {
    const payload = {
      user: req.user.id,
      session: req.body.session || null,
      sessionType: req.body.sessionType || "session",
      role: req.body.role || "",
      jobDescription: req.body.jobDescription || "",
      resumeSnapshot: req.body.resumeSnapshot || { text: "", data: {} },
      questionsAsked: req.body.questionsAsked || [],
      voiceMetrics: req.body.voiceMetrics || {},
      webcamMetrics: req.body.webcamMetrics || {},
      recording: req.body.recording || null,
      report: req.body.report || null,
      interviewMeta: req.body.interviewMeta || null,
      overallScore: req.body.overallScore || 0,
      feedback: req.body.feedback || [],
      strengths: req.body.strengths || [],
      weaknesses: req.body.weaknesses || [],
    };

    const attempt = await InterviewAttempt.create(payload);
    res.status(201).json({ success: true, attempt });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save interview attempt" });
  }
};

const uploadAttemptRecording = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No recording file was uploaded" });
    }

    const relativeStoragePath = path
      .join("uploads", "recordings", req.file.filename)
      .replace(/\\/g, "/");

    res.status(201).json({
      success: true,
      recording: {
        fileName: req.file.originalname,
        storagePath: relativeStoragePath,
        url: `/${relativeStoragePath}`,
        mimeType: req.file.mimetype || "video/webm",
        sizeBytes: req.file.size || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to upload recording" });
  }
};

const getMyAttempts = async (req, res) => {
  try {
    const attempts = await InterviewAttempt.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, attempts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch attempt history" });
  }
};

const getAttemptById = async (req, res) => {
  try {
    const attempt = await InterviewAttempt.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).lean();

    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }

    res.status(200).json({ success: true, attempt });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch attempt details" });
  }
};

const getAttemptStats = async (req, res) => {
  try {
    const attempts = await InterviewAttempt.find({ user: req.user.id })
      .sort({ createdAt: 1 })
      .lean();

    const trend = attempts.map((attempt) => ({
      date: attempt.createdAt,
      overallScore: attempt.overallScore || 0,
      clarityScore: attempt.voiceMetrics?.clarityScore || 0,
      grammarScore: attempt.voiceMetrics?.grammarScore || 0,
      fillerScore: attempt.voiceMetrics?.fillerScore || 0,
      eyeContactRate: attempt.webcamMetrics?.eyeContactRate || 0,
    }));

    res.status(200).json({ success: true, trend });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch attempt stats" });
  }
};

module.exports = { createAttempt, uploadAttemptRecording, getMyAttempts, getAttemptById, getAttemptStats };
