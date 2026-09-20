const {fn,col,Op}=require("sequelize");
const Expense=require("../models/Expense");
const User=require("../models/User");
const {categorizeExpense}=require("../services/aiService");
exports.getExpenses=async(req,res)=>{try{res.json(await Expense.findAll({order:[["createdAt","DESC"]]}));}catch(e){res.status(500).json({message:e.message});}};
exports.createExpense=async(req,res)=>{try{
 const {amount,description,category}=req.body;
 if(!amount||!description)return res.status(400).json({message:"Amount and description are required"});
 let finalCategory=category,aiSuggested=false;
 if(!finalCategory){
  try{finalCategory=await categorizeExpense(description);aiSuggested=true;}
  catch(e){finalCategory="Other";}
 }
 res.status(201).json(await Expense.create({amount:Number(amount),description:description.trim(),category:finalCategory,aiSuggested,userId:req.user?.id||null}));
}catch(e){res.status(500).json({message:e.message});}};
exports.deleteExpense=async(req,res)=>{try{const x=await Expense.findByPk(req.params.id);if(!x)return res.status(404).json({message:"Expense not found"});await x.destroy();res.json({message:"Deleted"});}catch(e){res.status(500).json({message:e.message});}};
exports.getLeaderboard=async(req,res)=>{
 try{
  if(!req.user.isPremium)return res.status(403).json({message:"Leaderboard is available to premium users only"});
  const rows=await Expense.findAll({attributes:[[fn("SUM",col("amount")),"totalExpense"]],where:{userId:{[Op.ne]:null}},include:[{model:User,attributes:["email"],required:true}],group:["userId","User.id"],order:[[fn("SUM",col("amount")),"DESC"]],raw:true});
  res.json({leaderboard:rows.map((row,index)=>({rank:index+1,email:row["User.email"],totalExpense:Number(row.totalExpense)}))});
 }catch(e){res.status(500).json({message:e.message});}
};
