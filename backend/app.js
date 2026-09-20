const express=require("express"),cors=require("cors"),expenses=require("./routes/expenseRoutes"),ai=require("./routes/aiRoutes"),auth=require("./routes/authRoutes");
const app=express();
const vercelOrigin=process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:null;
const allowedOrigins=(process.env.CORS_ORIGINS||"http://localhost:5173,http://localhost:5500,https://ai-expense-tracker-smoky-pi.vercel.app").split(",").map(origin=>origin.trim()).filter(Boolean);
if(vercelOrigin)allowedOrigins.push(vercelOrigin);
app.use(cors({origin(origin,callback){if(!origin||allowedOrigins.includes("*")||allowedOrigins.includes(origin))return callback(null,true);return callback(new Error("Origin is not allowed by CORS"));}}));
app.use(express.json());app.get("/",(q,s)=>s.json({message:"AI Expense Tracker API"}));app.use("/api/auth",auth);app.use("/api/expenses",expenses);app.use("/api/ai",ai);module.exports=app;
