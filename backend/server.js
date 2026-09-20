require("dotenv").config();const app=require("./app"),db=require("./config/database");const PORT=process.env.PORT||5000;
(async()=>{try{await db.authenticate();await db.sync({alter:true});app.listen(PORT,()=>console.log(`http://localhost:${PORT}`));}catch(e){console.error(e);}})();
