const {DataTypes}=require("sequelize");
const db=require("../config/database");

module.exports=db.define("User",{
 id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true},
 email:{type:DataTypes.STRING,allowNull:false,unique:true,validate:{isEmail:true}},
 passwordHash:{type:DataTypes.STRING,allowNull:false},
 isPremium:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:false}
},{tableName:"users",timestamps:true});
