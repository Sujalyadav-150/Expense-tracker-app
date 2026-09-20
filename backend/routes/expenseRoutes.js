const router = require("express").Router();
const controller = require("../controllers/expenseController");
const authMiddleware = require("../middleware/auth");

router.get("/leaderboard", authMiddleware.optional, controller.getLeaderboard);
router.get("/", authMiddleware.optional, controller.getExpenses);
router.post("/", authMiddleware.optional, controller.createExpense);
router.delete("/:id", authMiddleware.optional, controller.deleteExpense);

module.exports = router;
