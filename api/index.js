const app = require("../backend/app");
const db = require("../backend/config/database");

let initialized;

module.exports = async (req, res) => {
  initialized ||= db.sync();
  await initialized;
  return app(req, res);
};