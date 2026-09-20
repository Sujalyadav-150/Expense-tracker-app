require("dotenv").config();const app=require("./app"),db=require("./config/database");const PORT=process.env.PORT||5000;const HOST=process.env.HOST||"0.0.0.0";
(async()=>{try{await db.authenticate();await db.sync({alter:true});app.listen(PORT,HOST,()=>console.log(`Backend listening on ${HOST}:${PORT}`));}catch(e){console.error(e);process.exitCode=1;}})();
