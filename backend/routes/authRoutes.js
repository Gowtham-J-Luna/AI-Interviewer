const express = require("express");
const {
  registerUser,
  loginUser,
  getUserProfile,
  getAllUsers,
  deleteUser,
  updateResumeLink,
  googleAuthUser,
  firebaseAuthUser,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuthUser);
router.post("/firebase", firebaseAuthUser);
router.get("/profile", protect, getUserProfile);
router.put("/resume-link", protect, updateResumeLink);
router.get("/users", getAllUsers);
router.delete("/users/:id", deleteUser);

module.exports = router;
