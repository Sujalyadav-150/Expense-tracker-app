const router = require("express").Router();
const controller = require("../controllers/aiController");
const authMiddleware = require("../middleware/auth");

// Categorize — no auth required (used live as user types description).
router.post("/categorize", controller.categorize);

// Insight — auth required (returns insight for the logged-in user's expenses).
router.get("/insight", authMiddleware, controller.insight);

module.exports = router;
