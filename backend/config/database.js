const path = require("path");
const { Sequelize } = require("sequelize");

const storage = process.env.DB_PATH || (process.env.VERCEL ? "/tmp/expenses.sqlite" : path.join(__dirname, "../database/expenses.sqlite"));
module.exports = new Sequelize({dialect:"sqlite",storage,logging:false});
