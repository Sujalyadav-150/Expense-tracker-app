const express=require("express"),cors=require("cors"),expenses=require("./routes/expenseRoutes"),ai=require("./routes/aiRoutes"),auth=require("./routes/authRoutes");
const app=express();app.use(cors());app.use(express.json());app.get("/",(q,s)=>s.json({message:"AI Expense Tracker API"}));app.use("/api/auth",auth);app.use("/api/expenses",expenses);app.use("/api/ai",ai);module.exports=app;
