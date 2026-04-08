const User = require("../models/User");
const Session = require("../models/Session");
const Question = require("../models/Question");
const InterviewAttempt = require("../models/InterviewAttempt");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getFirebaseAdmin } = require("../utils/firebaseAdmin");

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Helper function to generate initials from full name
const generateInitials = (name) => {
  if (!name) return "U";

  const words = name.trim().split(" ").filter(Boolean);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

// @desc    Login/Register user via Google OAuth
// @route   POST /api/auth/google
// @access  Public
const googleAuthUser = async (req, res) => {
  try {
    const { email, name, profileImageUrl } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        profileImageUrl,
        authProvider: "google",
        initials: generateInitials(name),
      });
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      resumeLink: user.resumeLink,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Exchange verified Firebase token for app JWT
// @route   POST /api/auth/firebase
// @access  Public
const firebaseAuthUser = async (req, res) => {
  try {
    const { idToken, profileImageUrl, name: fallbackName } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Firebase ID token is required" });
    }

    const firebaseAdmin = getFirebaseAdmin();
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const firebaseUser = await firebaseAdmin.auth().getUser(decodedToken.uid);

    const email = firebaseUser.email;
    if (!email) {
      return res.status(400).json({ message: "Firebase user email is required" });
    }

    const providerId = firebaseUser.providerData?.[0]?.providerId || "unknown";
    const authProvider =
      providerId === "google.com"
        ? "google"
        : providerId === "password"
        ? "firebase-email"
        : "unknown";

    const name = firebaseUser.displayName || fallbackName || email.split("@")[0];

    let user = await User.findOne({
      $or: [{ firebaseUid: decodedToken.uid }, { email }],
    });

    if (!user) {
      user = await User.create({
        name,
        email,
        firebaseUid: decodedToken.uid,
        authProvider,
        profileImageUrl: profileImageUrl || firebaseUser.photoURL || generateInitials(name),
        initials: generateInitials(name),
      });
    } else {
      user.name = user.name || name;
      user.firebaseUid = decodedToken.uid;
      user.authProvider = authProvider;
      user.profileImageUrl =
        user.profileImageUrl || profileImageUrl || firebaseUser.photoURL || generateInitials(name);
      user.initials = user.initials || generateInitials(user.name || name);
      await user.save();
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      resumeLink: user.resumeLink,
      authProvider: user.authProvider,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Firebase authentication failed" });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, profileImageUrl } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      profileImageUrl,
      authProvider: "local",
      initials: generateInitials(name),
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      resumeLink: user.resumeLink,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password").lean();

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(401).json({ message: "Please use Google login for this account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    delete user.password;

    if (
      !user.profileImageUrl ||
      user.profileImageUrl === "Hi" ||
      user.profileImageUrl.length < 1 ||
      user.profileImageUrl.length > 255
    ) {
      const newInitials = generateInitials(user.name);
      await User.findByIdAndUpdate(user._id, { profileImageUrl: newInitials, initials: newInitials });
      user.profileImageUrl = newInitials;
    }

    res.json({
      ...user,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private (Requires JWT)
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.profileImageUrl || user.profileImageUrl === "Hi" || user.profileImageUrl.length < 1) {
      const newInitials = generateInitials(user.name);
      await User.findByIdAndUpdate(user._id, { profileImageUrl: newInitials, initials: newInitials });
      user.profileImageUrl = newInitials;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Public
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete a user
// @route   DELETE /api/auth/users/:id
// @access  Public (Admin)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userSessions = await Session.find({ user: userId });
    const sessionIds = userSessions.map((session) => session._id);

    if (sessionIds.length > 0) {
      await Question.deleteMany({ session: { $in: sessionIds } });
    }

    await InterviewAttempt.deleteMany({ user: userId });
    await Session.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "User and all related data deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete user",
    });
  }
};

// @desc    Update user resume link
// @route   PUT /api/auth/resume-link
// @access  Private
const updateResumeLink = async (req, res) => {
  try {
    const { resumeLink } = req.body;
    const userId = req.user.id;

    const user = await User.findByIdAndUpdate(userId, { resumeLink }, { new: true }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Resume link updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        resumeLink: user.resumeLink,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  getAllUsers,
  deleteUser,
  updateResumeLink,
  googleAuthUser,
  firebaseAuthUser,
};
