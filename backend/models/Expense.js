const {DataTypes}=require("sequelize");
const db=require("../config/database");
const User=require("./User");
const Expense=db.define("Expense",{id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true},amount:{type:DataTypes.FLOAT,allowNull:false},description:{type:DataTypes.TEXT,allowNull:false},category:{type:DataTypes.STRING,allowNull:false},aiSuggested:{type:DataTypes.BOOLEAN,defaultValue:true},userId:{type:DataTypes.INTEGER,allowNull:true}},{tableName:"expenses",timestamps:true});
Expense.belongsTo(User,{foreignKey:"userId"});
User.hasMany(Expense,{foreignKey:"userId"});
module.exports=Expense;
