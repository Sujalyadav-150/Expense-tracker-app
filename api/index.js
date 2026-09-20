const app = require("../backend/app");
const db = require("../backend/config/database");

let initialized;

async function initialize() {
  if (!initialized) {
    initialized = db.authenticate().then(() => db.sync());
  }
  try {
    await initialized;
  } catch (error) {
    initialized = undefined;
    throw error;
  }
}

module.exports = async (req, res) => {
  try {
    await initialize();
    return app(req, res);
  } catch (error) {
    console.error("Database initialization failed", error);
    return res.status(500).json({message: "Database initialization failed"});
  }
};