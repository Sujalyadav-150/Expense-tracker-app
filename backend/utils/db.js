const fs = require("fs");
const path = require("path");
const { connectDB } = require("../config/database");
const User = require("../models/User");
const Expense = require("../models/Expense");
const PasswordResetToken = require("../models/PasswordResetToken");

const isProduction = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NODE_ENV === "production");
const dataDirectory = path.join(__dirname, "../data");
const tmpDirectory = "/tmp";
const usersFile = path.join(tmpDirectory, "users.json");
const expensesFile = path.join(tmpDirectory, "expenses.json");
const tokensFile = path.join(tmpDirectory, "password-reset-tokens.json");

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch { return fallback; }
}
function writeJson(filePath, data) {
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8"); }
  catch (err) { console.error("writeJson error:", err.message); }
}
async function ensureDB() {
  const connected = await connectDB();
  if (isProduction && !connected) throw new Error("MongoDB connection is required in production.");
  return connected;
}

async function getUser(email) {
  const normEmail = String(email || "").trim().toLowerCase();
  if (!normEmail) return null;
  if (await ensureDB()) {
    const u = await User.findOne({ email: normEmail }).lean();
    return u ? { id: String(u._id), name: u.name || "User", password: u.password, email: u.email, isPremium: !!u.isPremium } : null;
  }
  if (isProduction) throw new Error("MongoDB connection is required in production.");
  const u = readJson(usersFile, {})[normEmail];
  return u ? { id: normEmail, name: u.name || "User", password: u.password, email: normEmail, isPremium: !!u.isPremium } : null;
}

async function createUser({ name, email, password, isPremium = false }) {
  const normEmail = String(email || "").trim().toLowerCase();
  const trimmedName = String(name || "").trim() || "User";
  if (!normEmail || !password) throw new Error("Email and password are required.");
  if (await ensureDB()) {
    if (await User.findOne({ email: normEmail })) { const e = new Error("An account with this email already exists."); e.statusCode = 409; throw e; }
    const u = await User.create({ email: normEmail, name: trimmedName, password, isPremium });
    return { id: String(u._id), name: u.name, email: u.email, isPremium: !!u.isPremium };
  }
  if (isProduction) throw new Error("MongoDB connection is required in production.");
  const users = readJson(usersFile, {});
  if (users[normEmail]) { const e = new Error("An account with this email already exists."); e.statusCode = 409; throw e; }
  users[normEmail] = { name: trimmedName, password, isPremium };
  writeJson(usersFile, users);
  return { id: normEmail, name: trimmedName, email: normEmail, isPremium };
}

async function updateUserPassword(email, hashedPassword) {
  const normEmail = String(email || "").trim().toLowerCase();
  if (await ensureDB()) {
    const u = await User.findOneAndUpdate({ email: normEmail }, { password: hashedPassword }, { new: true });
    if (!u) { const e = new Error("User not found."); e.statusCode = 404; throw e; }
    return true;
  }
  if (isProduction) throw new Error("MongoDB connection is required in production.");
  const users = readJson(usersFile, {});
  if (!users[normEmail]) { const e = new Error("User not found."); e.statusCode = 404; throw e; }
  users[normEmail].password = hashedPassword; writeJson(usersFile, users); return true;
}

async function getExpenses(email) {
  const normEmail = String(email || "").trim().toLowerCase();
  if (await ensureDB()) {
    return (await Expense.find({ email: normEmail }).sort({ createdAt: -1 }).lean()).map(e => ({
      id: e.id ?? String(e._id), amount: e.amount, description: e.description, category: e.category,
      categorySource: e.categorySource || "fallback", aiSuggested: !!e.aiSuggested, createdAt: e.createdAt
    }));
  }
  if (isProduction) throw new Error("MongoDB connection is required in production.");
  return readJson(expensesFile, {})[normEmail] || [];
}

function makeExpenseId() {
  // Avoid an extra MongoDB read before every insert. This keeps Vercel
  // requests to one DB write and remains safely within JavaScript's integer range.
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

async function addExpense({ email, amount, description, category, categorySource, aiSuggested = false }) {
  const normEmail = String(email || "").trim().toLowerCase();
  const id = makeExpenseId();
  if (await ensureDB()) {
    const e = await Expense.create({ id, email: normEmail, amount: Number(amount), description: String(description).trim(), category: String(category), categorySource: categorySource || "fallback", aiSuggested: !!aiSuggested });
    return { id:e.id, amount:e.amount, description:e.description, category:e.category, categorySource:e.categorySource, aiSuggested:e.aiSuggested, createdAt:e.createdAt };
  }
  if (isProduction) throw new Error("MongoDB connection is required in production.");
  const record={id,amount:Number(amount),description:String(description).trim(),category:String(category),categorySource:categorySource||"fallback",aiSuggested:!!aiSuggested,createdAt:new Date().toISOString()};
  const map=readJson(expensesFile,{}); (map[normEmail] ||= []).push(record); writeJson(expensesFile,map); return record;
}

async function deleteExpense(email, expenseId) {
  const normEmail=String(email||"").trim().toLowerCase(), id=String(expenseId||"").trim(), n=Number(id);
  if (await ensureDB()) {
    const conditions=[{email:normEmail,id}];
    if (/^\d+$/.test(id)) conditions.push({email:normEmail,id:n});
    const r=await Expense.deleteOne({$or:conditions});
    if(!r.deletedCount){const e=new Error("Expense not found.");e.statusCode=404;throw e;} return true;
  }
  if(isProduction) throw new Error("MongoDB connection is required in production.");
  const map=readJson(expensesFile,{}), list=map[normEmail]||[], i=list.findIndex(e=>String(e.id)===id);
  if(i<0){const e=new Error("Expense not found.");e.statusCode=404;throw e;} list.splice(i,1); map[normEmail]=list; writeJson(expensesFile,map); return true;
}

async function getLeaderboard(limit=10) {
  if (await ensureDB()) {
    const rows=await Expense.aggregate([
      {$group:{_id:"$email",totalExpense:{$sum:"$amount"}}},
      {$sort:{totalExpense:-1}},
      {$limit:limit},
      {$lookup:{from:"users",localField:"_id",foreignField:"email",as:"user"}},
      {$unwind:"$user"},
      {$project:{_id:0,name:"$user.name",email:"$_id",totalExpense:1}}
    ]);
    return rows.map((r,i)=>({rank:i+1,name:r.name||"User",email:r.email,totalExpense:Number(r.totalExpense||0)}));
  }
  if(isProduction) throw new Error("MongoDB connection is required in production.");
  const users=readJson(usersFile,{}), expenses=readJson(expensesFile,{});
  return Object.entries(users).map(([email,u])=>({name:u.name||"User",email,totalExpense:(expenses[email]||[]).reduce((s,e)=>s+Number(e.amount||0),0)})).filter(x=>x.totalExpense>0).sort((a,b)=>b.totalExpense-a.totalExpense).slice(0,limit).map((x,i)=>({rank:i+1,...x}));
}

async function createResetToken({email,rawToken,expiresInMs=900000}) {
  const record=PasswordResetToken.create({userId:email,rawToken,expiresInMs});
  if(await ensureDB()){await PasswordResetToken.MongooseModel.create({...record,createdAt:new Date(record.createdAt),expiresAt:new Date(record.expiresAt)});return record;}
  if(isProduction) throw new Error("MongoDB connection is required in production.");
  const list=readJson(tokensFile,[]);list.push(record);writeJson(tokensFile,list);return record;
}
async function getResetTokenByHash(tokenHash){
  if(await ensureDB()){const d=await PasswordResetToken.MongooseModel.findOne({tokenHash}).lean();return d?{id:d.id,userId:d.userId,tokenHash:d.tokenHash,createdAt:d.createdAt,expiresAt:d.expiresAt,usedAt:d.usedAt}:null;}
  if(isProduction) throw new Error("MongoDB connection is required in production.");
  return readJson(tokensFile,[]).find(t=>t.tokenHash===tokenHash)||null;
}
async function markTokenUsed(idOrHash){
  if(await ensureDB()){await PasswordResetToken.MongooseModel.updateOne({$or:[{id:idOrHash},{tokenHash:idOrHash}]},{usedAt:new Date()});return true;}
  if(isProduction) throw new Error("MongoDB connection is required in production.");
  const list=readJson(tokensFile,[]),r=list.find(t=>t.id===idOrHash||t.tokenHash===idOrHash);if(r){r.usedAt=new Date().toISOString();writeJson(tokensFile,list);}return true;
}
module.exports={getUser,createUser,updateUserPassword,getExpenses,addExpense,deleteExpense,getLeaderboard,createResetToken,getResetTokenByHash,markTokenUsed,connectDB};
