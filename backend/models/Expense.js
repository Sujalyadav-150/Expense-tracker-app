const {DataTypes}=require("sequelize");
const db=require("../config/database");
module.exports=db.define("Expense",{id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true},amount:{type:DataTypes.FLOAT,allowNull:false},description:{type:DataTypes.TEXT,allowNull:false},category:{type:DataTypes.STRING,allowNull:false},aiSuggested:{type:DataTypes.BOOLEAN,defaultValue:true}},{tableName:"expenses",timestamps:true});
