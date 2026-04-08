const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/ai-interviewer";

  try {
    await mongoose.connect(mongoUri, {});
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Error connecting to MongoDB", err.message);
    console.error(
      "Checked MONGO_URI, MONGODB_URI, then local fallback mongodb://127.0.0.1:27017/ai-interviewer."
    );
    process.exit(1);
  }
};

module.exports = connectDB;
