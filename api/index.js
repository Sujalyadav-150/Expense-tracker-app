const app = require("../backend/app");
const { connectDB } = require("../backend/config/database");

module.exports = async (req, res) => {
  try {
    // Static frontend requests do not need MongoDB. Avoid making the whole
    // Vercel site unavailable when the database is briefly unreachable.
    // Protected API handlers connect lazily through the shared db utility.
    const pathname = String(req.url || "").split("?")[0];
    if (pathname.startsWith("/api/") || pathname.startsWith("/purchase")) {
      await connectDB();
    }
    return app(req, res);
  } catch (error) {
    console.error("Vercel Function Error:", error.message);
    return res.status(503).json({ success: false, message: "Database unavailable. Please try again shortly." });
  }
};