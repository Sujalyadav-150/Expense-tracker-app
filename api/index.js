const app = require("../backend/app");
const { connectDB } = require("../backend/config/database");

let dbInitialized = false;

module.exports = async (req, res) => {
  try {
    if (!dbInitialized) {
      dbInitialized = true;
      connectDB().catch(err => {
        console.warn("DB connection warning on startup:", err.message);
      });
    }
    return app(req, res);
  } catch (error) {
    console.error("Vercel Function Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};