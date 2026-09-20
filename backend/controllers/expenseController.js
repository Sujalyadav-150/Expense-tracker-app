const db = require("../utils/db");
const { categorizeExpense } = require("../services/aiService");

exports.getExpenses = async (req, res) => {
  try {
    const email = req.user?.email || String(req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.json([]);
    }
    const list = await db.getExpenses(email);
    return res.json(Array.isArray(list) ? list : []);
  } catch (error) {
    console.error("getExpenses error:", error.message);
    return res.status(500).json({ success: false, message: "Could not load expenses." });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { amount, description, category, categorySource } = req.body;
    const email = req.user?.email || String(req.body.email || "").trim().toLowerCase();
    const numericAmount = Number(amount);

    if (!email || !Number.isFinite(numericAmount) || numericAmount <= 0 || !String(description || "").trim()) {
      return res.status(400).json({ success: false, message: "Valid amount and description are required." });
    }

    let finalCategory = category;
    let finalSource = categorySource || "fallback";
    let aiSuggested = false;

    if (!finalCategory) {
      try {
        finalCategory = await categorizeExpense(description);
        finalSource = "ai";
        aiSuggested = true;
      } catch (e) {
        finalCategory = "Other";
        finalSource = "fallback";
      }
    }

    const created = await db.addExpense({
      email,
      amount: numericAmount,
      description: String(description).trim(),
      category: String(finalCategory),
      categorySource: finalSource,
      aiSuggested,
      userId: req.user?.id || null
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error("createExpense error:", error.message);
    return res.status(500).json({ success: false, message: error.message || "Could not add expense." });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const email = req.user?.email || String(req.query.email || "").trim().toLowerCase();
    const rawId = String(req.params.id || "").trim();

    if (!email || !rawId) {
      return res.status(400).json({ success: false, message: "Email and expense ID are required." });
    }

    await db.deleteExpense(email, rawId);
    return res.json({ success: true, message: "Expense deleted successfully." });
  } catch (error) {
    console.error("deleteExpense error:", error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || "Expense not found." });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 10;
    const leaderboard = await db.getLeaderboard(limit);
    return res.json({ leaderboard: Array.isArray(leaderboard) ? leaderboard : [] });
  } catch (error) {
    console.error("getLeaderboard error:", error.message);
    return res.status(500).json({ success: false, message: "Could not load leaderboard." });
  }
};
