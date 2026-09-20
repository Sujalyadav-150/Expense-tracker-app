const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const User=require("../models/User");

function tokenFor(user){return jwt.sign({userId:user.id},process.env.JWT_SECRET||"development-secret-change-me",{expiresIn:"7d"});}
function premiumEmail(email){return (process.env.PREMIUM_EMAILS||"").split(",").map(value=>value.trim().toLowerCase()).includes(email.toLowerCase());}

exports.register=async(req,res)=>{
 try{
  const email=String(req.body.email||"").trim().toLowerCase();
  const password=String(req.body.password||"");
  if(!email||password.length<6)return res.status(400).json({message:"Valid email and password of at least 6 characters are required"});
  if(await User.findOne({where:{email}}))return res.status(409).json({message:"Email is already registered"});
  const user=await User.create({email,passwordHash:await bcrypt.hash(password,10),isPremium:premiumEmail(email)});
    res.status(201).json({user:{id:user.id,email:user.email,isPremium:user.isPremium}});
 }catch(e){res.status(500).json({message:e.message});}
};

exports.login=async(req,res)=>{
 try{
  const email=String(req.body.email||"").trim().toLowerCase();
  const user=await User.findOne({where:{email}});
  if(!user||!(await bcrypt.compare(String(req.body.password||""),user.passwordHash)))return res.status(401).json({message:"Invalid email or password"});
  res.json({token:tokenFor(user),user:{id:user.id,email:user.email,isPremium:user.isPremium}});
 }catch(e){res.status(500).json({message:e.message});}
};
