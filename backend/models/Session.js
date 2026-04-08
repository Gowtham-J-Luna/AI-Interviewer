const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  role: { type: String },
  experience: { type: String },
  topicsToFocus: { type: String },
  description: String,
  jobDescription: { type: String, default: "" },
  resumeTextSnapshot: { type: String, default: "" },
  resumeData: {
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
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  endTime: { type: Date },
  isResumeSession: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Session", sessionSchema);
