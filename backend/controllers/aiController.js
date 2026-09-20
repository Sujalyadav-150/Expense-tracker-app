const db = require("../utils/db");
const { categorizeExpense, spendingInsight } = require("../services/aiService");

exports.categorize = async (req, res) => {
  try {
    const description = String(req.body.description || "").trim();
    if (!description) {
      return res.status(400).json({ success: false, message: "Description is required" });
    }
    const category = await categorizeExpense(description);
    return res.json({ category, source: "ai" });
  } catch (e) {
    console.error("ai categorize error:", e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.insight = async (req, res) => {
  try {
    const email = req.user?.email || String(req.query.email || "").trim().toLowerCase();
    const list = email ? await db.getExpenses(email) : [];
    const insightText = list.length ? await spendingInsight(list) : "Add expenses to get an AI spending insight.";
    return res.json({ insight: insightText, message: insightText });
  } catch (e) {
    console.error("ai insight error:", e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};
