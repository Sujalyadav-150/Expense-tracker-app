const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../utils/db");

const JWT_SECRET = process.env.JWT_SECRET;
const PREMIUM_AMOUNT = 199;

function generateOrderId() {
  return `order_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
}

function generateToken(user) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is required.");
  return jwt.sign({
    id: user.id,
    email: user.email,
    name: user.name || "User",
    isPremium: true,
    ispremiumuser: true
  }, JWT_SECRET, { expiresIn: "30d" });
}

exports.createPremiumOrder = async (req, res) => {
  try {
    if (req.user.isPremium || req.user.ispremiumuser) {
      return res.status(400).json({ success: false, message: "This account is already Premium." });
    }

    const orderId = generateOrderId();
    const paymentSessionId = `sandbox_session_${crypto.randomBytes(12).toString("hex")}`;
    await db.createPremiumOrder({
      userId: req.user.id,
      email: req.user.email,
      orderId,
      amount: PREMIUM_AMOUNT,
      paymentSessionId
    });

    return res.status(201).json({
      success: true,
      payment_session_id: paymentSessionId,
      order_id: orderId,
      amount: PREMIUM_AMOUNT,
      mode: "sandbox"
    });
  } catch (error) {
    console.error("create premium order error:", error.message);
    if (db.isDatabaseError(error)) {
      return res.status(503).json({ success: false, message: "Database temporarily unavailable." });
    }
    return res.status(500).json({ success: false, message: "Could not create premium order." });
  }
};

exports.updatePremiumStatus = async (req, res) => {
  try {
    const orderId = String(req.body.orderId || "").trim();
    const requestedStatus = String(req.body.status || "").trim().toUpperCase();
    const isSandboxSuccess = req.body.testSuccess === true;

    if (!orderId || !["SUCCESSFUL", "FAILED", "CANCELLED", "SUCCESS"].includes(requestedStatus)) {
      return res.status(400).json({ success: false, message: "Valid orderId and status are required." });
    }

    const successful = (requestedStatus === "SUCCESSFUL" || requestedStatus === "SUCCESS") && isSandboxSuccess;
    const status = successful ? "SUCCESSFUL" : "FAILED";
    const order = await db.updatePremiumOrder(orderId, req.user.email, status);
    if (!order) {
      return res.status(404).json({ success: false, message: "Premium order not found." });
    }

    if (!successful) {
      return res.status(200).json({ success: false, status: "FAILED" });
    }

    const user = await db.markUserPremium(req.user.email);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({
      success: true,
      status: "SUCCESSFUL",
      token: generateToken(user),
      user
    });
  } catch (error) {
    console.error("update premium status error:", error.message);
    if (db.isDatabaseError(error)) {
      return res.status(503).json({ success: false, message: "Database temporarily unavailable." });
    }
    return res.status(500).json({ success: false, message: "Could not update payment status." });
  }
};