const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String },
    firebaseUid: { type: String, index: true, sparse: true },
    authProvider: {
      type: String,
      enum: ["local", "firebase-email", "google", "unknown"],
      default: "local",
    },
    profileImageUrl: { type: String, default: null },
    resumeLink: { type: String, default: null },
    initials: { type: String }, // User initials for display
    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
