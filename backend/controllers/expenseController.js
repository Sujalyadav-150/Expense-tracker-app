const Expense=require("../models/Expense");
const {categorizeExpense}=require("../services/aiService");
exports.getExpenses=async(req,res)=>{try{res.json(await Expense.findAll({order:[["createdAt","DESC"]]}));}catch(e){res.status(500).json({message:e.message});}};
exports.createExpense=async(req,res)=>{try{
 const {amount,description,category}=req.body;
 if(!amount||!description)return res.status(400).json({message:"Amount and description are required"});
 let finalCategory=category,aiSuggested=false;
 if(!finalCategory){finalCategory=await categorizeExpense(description);aiSuggested=true;}
 res.status(201).json(await Expense.create({amount:Number(amount),description:description.trim(),category:finalCategory,aiSuggested}));
}catch(e){res.status(500).json({message:e.message});}};
exports.deleteExpense=async(req,res)=>{try{const x=await Expense.findByPk(req.params.id);if(!x)return res.status(404).json({message:"Expense not found"});await x.destroy();res.json({message:"Deleted"});}catch(e){res.status(500).json({message:e.message});}};
