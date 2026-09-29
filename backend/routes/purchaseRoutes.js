const router = require("express").Router();
const controller = require("../controllers/purchaseController");

router.post("/premium", controller.createPremiumOrder);
router.post("/update-status", controller.updatePremiumStatus);

module.exports = router;