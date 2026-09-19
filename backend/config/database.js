const { Sequelize } = require("sequelize");
module.exports = new Sequelize({dialect:"sqlite",storage:"./database/expenses.sqlite",logging:false});
