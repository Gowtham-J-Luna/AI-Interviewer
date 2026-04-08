const mongoose = require("mongoose");

const questionAttemptSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    transcript: { type: String, default: "" },
    durationMs: { type: Number, default: 0 },
    voiceMetrics: {
      fillerWords: { type: Number, default: 0 },
      longPauses: { type: Number, default: 0 },
      grammarIssues: { type: Number, default: 0 },
      paceWpm: { type: Number, default: 0 },
      transcriptAccuracy: { type: Number, default: 0 },
      fillerScore: { type: Number, default: 0 },
      grammarScore: { type: Number, default: 0 },
      clarityScore: { type: Number, default: 0 },
      overallScore: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const interviewAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", default: null, index: true },
    sessionType: { type: String, default: "session" },
    role: { type: String, default: "" },
    jobDescription: { type: String, default: "" },
    resumeSnapshot: {
      text: { type: String, default: "" },
      data: {
        summary: { type: String, default: "" },
        skills: [{ type: String }],
        experience: [{ type: String }],
        projects: [{ type: String }],
        education: [{ type: String }],
        inferredRole: { type: String, default: "" },
        inferredExperienceYears: { type: Number, default: 0 },
        topKeywords: [{ type: String }],
        contactInfo: {
          email: { type: String, default: "" },
          phone: { type: String, default: "" },
          linkedin: { type: String, default: "" },
          github: { type: String, default: "" },
        },
      },
    },
    questionsAsked: [questionAttemptSchema],
    voiceMetrics: {
      fillerWords: { type: Number, default: 0 },
      longPauses: { type: Number, default: 0 },
      grammarIssues: { type: Number, default: 0 },
      paceWpm: { type: Number, default: 0 },
      transcriptAccuracy: { type: Number, default: 0 },
      fillerScore: { type: Number, default: 0 },
      grammarScore: { type: Number, default: 0 },
      clarityScore: { type: Number, default: 0 },
      overallScore: { type: Number, default: 0 },
    },
    webcamMetrics: {
      cameraSupported: { type: Boolean, default: false },
      faceDetectionSupported: { type: Boolean, default: false },
      calibrated: { type: Boolean, default: false },
      calibrationProgress: { type: Number, default: 0 },
      eyeContactRate: { type: Number, default: 0 },
      trackingConfidence: { type: Number, default: 0 },
      gazeStability: { type: Number, default: 0 },
      stressScore: { type: Number, default: 0 },
      noFaceEvents: { type: Number, default: 0 },
      offCenterEvents: { type: Number, default: 0 },
      stressFlags: { type: Number, default: 0 },
      prompts: [{ type: String }],
    },
    recording: {
      fileName: { type: String, default: "" },
      storagePath: { type: String, default: "" },
      url: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      sizeBytes: { type: Number, default: 0 },
      durationMs: { type: Number, default: 0 },
      startedAt: { type: Date, default: null },
      endedAt: { type: Date, default: null },
    },
    report: {
      generatedAt: { type: Date, default: null },
      question: { type: String, default: "" },
      transcript: { type: String, default: "" },
      pdfData: { type: mongoose.Schema.Types.Mixed, default: null },
      analysisSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    interviewMeta: {
      startedAt: { type: Date, default: null },
      endedAt: { type: Date, default: null },
      questionsCompleted: { type: Number, default: 0 },
    },
    overallScore: { type: Number, default: 0 },
    feedback: [{ type: String }],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewAttempt", interviewAttemptSchema);
