const jwt=require("jsonwebtoken");
const User=require("../models/User");

module.exports=async function auth(req,res,next){
 const header=req.headers.authorization||"";
 const token=header.startsWith("Bearer ")?header.slice(7):null;
 if(!token)return res.status(401).json({message:"Authentication required"});
 try{
  const payload=jwt.verify(token,process.env.JWT_SECRET||"development-secret-change-me");
  const user=await User.findByPk(payload.userId,{attributes:["id","email","isPremium"]});
  if(!user)return res.status(401).json({message:"User not found"});
  req.user=user;
  next();
 }catch(e){return res.status(401).json({message:"Invalid or expired token"});}
};

module.exports.optional=async function optionalAuth(req,res,next){
 const header=req.headers.authorization||"";
 const token=header.startsWith("Bearer ")?header.slice(7):null;
 if(!token)return next();
 try{
  const payload=jwt.verify(token,process.env.JWT_SECRET||"development-secret-change-me");
  req.user=await User.findByPk(payload.userId,{attributes:["id","email","isPremium"]});
 }catch(e){}
 next();
};
