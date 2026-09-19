const Expense=require("../models/Expense");
const {categorizeExpense,spendingInsight}=require("../services/aiService");
exports.categorize=async(req,res)=>{try{res.json({category:await categorizeExpense(req.body.description)});}catch(e){res.status(500).json({message:e.message});}};
exports.insight=async(req,res)=>{try{const x=await Expense.findAll();res.json({insight:x.length?await spendingInsight(x):"Add expenses to get an AI insight."});}catch(e){res.status(500).json({message:e.message});}};
