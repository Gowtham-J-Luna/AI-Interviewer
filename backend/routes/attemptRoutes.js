const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { protect } = require("../middlewares/authMiddleware");
const {
  createAttempt,
  uploadAttemptRecording,
  getMyAttempts,
  getAttemptById,
  getAttemptStats,
} = require("../controllers/attemptController");

const router = express.Router();
const recordingsDir = path.join(__dirname, "..", "uploads", "recordings");

fs.mkdirSync(recordingsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, recordingsDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || ".webm") || ".webm";
    const safeBaseName = path
      .basename(file.originalname || "recording", extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 50);

    cb(null, `${req.user?.id || "user"}-${Date.now()}-${safeBaseName}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

router.post("/recording", protect, upload.single("recording"), uploadAttemptRecording);
router.post("/", protect, createAttempt);
router.get("/", protect, getMyAttempts);
router.get("/stats", protect, getAttemptStats);
router.get("/:id", protect, getAttemptById);

module.exports = router;
