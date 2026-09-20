const path = require("path");
const { Sequelize } = require("sequelize");
const sqlite3 = require("sqlite3");

const storage = process.env.DB_PATH || (process.env.VERCEL ? "/tmp/expenses.sqlite" : path.join(__dirname, "../database/expenses.sqlite"));
module.exports = new Sequelize({dialect:"sqlite",dialectModule:sqlite3,storage,logging:false});
