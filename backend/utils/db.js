const fs = require("fs");
const path = require("path");
const { connectDB, isConnected } = require("../config/database");

const User = require("../models/User");
const Expense = require("../models/Expense");
const PasswordResetToken = require("../models/PasswordResetToken");

const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);
const dataDirectory = path.join(__dirname, "../data");
const tmpDirectory = isVercel ? "/tmp" : dataDirectory;

try { fs.mkdirSync(dataDirectory, { recursive: true }); } catch {}
if (isVercel) {
  try { fs.mkdirSync(tmpDirectory, { recursive: true }); } catch {}
}

const usersFile = path.join(tmpDirectory, "users.json");
const expensesFile = path.join(tmpDirectory, "expenses.json");
const tokensFile = path.join(tmpDirectory, "password-reset-tokens.json");

const bundledUsers = path.join(dataDirectory, "users.json");
const bundledExpenses = path.join(dataDirectory, "expenses.json");
const bundledTokens = path.join(dataDirectory, "password-reset-tokens.json");

if (isVercel) {
  if (!fs.existsSync(usersFile) && fs.existsSync(bundledUsers)) {
    try { fs.copyFileSync(bundledUsers, usersFile); } catch {}
  }
  if (!fs.existsSync(expensesFile) && fs.existsSync(bundledExpenses)) {
    try { fs.copyFileSync(bundledExpenses, expensesFile); } catch {}
  }
  if (!fs.existsSync(tokensFile) && fs.existsSync(bundledTokens)) {
    try { fs.copyFileSync(bundledTokens, tokensFile); } catch {}
  }
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    if (!isVercel && filePath !== bundledUsers && filePath.includes("tmp")) {
      const base = path.basename(filePath);
      fs.writeFileSync(path.join(dataDirectory, base), JSON.stringify(data, null, 2), "utf8");
    }
  } catch (err) {
    console.error("writeJson error:", err.message);
  }
}

async function ensureDB() {
  return await connectDB();
}

// --- DATABASE API ---

async function getUser(email) {
  const normEmail = String(email || "").trim().toLowerCase();
  if (!normEmail) return null;
  if (await ensureDB()) {
    const userDoc = await User.findOne({ email: normEmail }).lean();
    if (!userDoc) return null;
    return {
      id: String(userDoc._id),
      name: userDoc.name || "User",
      password: userDoc.password,
      email: userDoc.email,
      isPremium: !!userDoc.isPremium
    };
  }
  const usersMap = readJson(usersFile, readJson(bundledUsers, {}));
  const u = usersMap[normEmail];
  if (!u) return null;
  return {
    id: normEmail,
    name: u.name || "User",
    password: u.password,
    email: normEmail,
    isPremium: !!u.isPremium
  };
}

async function createUser({ name, email, password, isPremium = false }) {
  const normEmail = String(email || "").trim().toLowerCase();
  const trimmedName = String(name || "").trim() || "User";
  if (!normEmail || !password) {
    throw new Error("Email and password are required.");
  }
  if (await ensureDB()) {
    const existing = await User.findOne({ email: normEmail });
    if (existing) {
      const err = new Error("An account with this email already exists.");
      err.statusCode = 409;
      throw err;
    }
    const newUser = await User.create({ email: normEmail, name: trimmedName, password, isPremium });
    return { id: String(newUser._id), name: newUser.name, email: newUser.email, isPremium: !!newUser.isPremium };
  }
  const usersMap = readJson(usersFile, readJson(bundledUsers, {}));
  if (usersMap[normEmail]) {
    const err = new Error("An account with this email already exists.");
    err.statusCode = 409;
    throw err;
  }
  usersMap[normEmail] = { name: trimmedName, password, isPremium };
  writeJson(usersFile, usersMap);
  return { id: normEmail, name: trimmedName, email: normEmail, isPremium };
}

async function updateUserPassword(email, hashedPassword) {
  const normEmail = String(email || "").trim().toLowerCase();
  if (await ensureDB()) {
    const updated = await User.findOneAndUpdate(
      { email: normEmail },
      { password: hashedPassword },
      { new: true }
    );
    if (!updated) {
      const err = new Error("User not found.");
      err.statusCode = 404;
      throw err;
    }
    return true;
  }
  const usersMap = readJson(usersFile, readJson(bundledUsers, {}));
  if (!usersMap[normEmail]) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }
  usersMap[normEmail].password = hashedPassword;
  writeJson(usersFile, usersMap);
  return true;
}

async function getExpenses(email) {
  const normEmail = String(email || "").trim().toLowerCase();
  if (await ensureDB()) {
    const list = await Expense.find({ email: normEmail }).sort({ createdAt: -1, id: -1 }).lean();
    return list.map(e => ({
      id: e.id !== undefined && e.id !== null ? e.id : String(e._id),
      amount: e.amount,
      description: e.description,
      category: e.category,
      categorySource: e.categorySource || "fallback",
      aiSuggested: !!e.aiSuggested,
      createdAt: e.createdAt || new Date().toISOString()
    }));
  }
  const expensesMap = readJson(expensesFile, readJson(bundledExpenses, {}));
  return expensesMap[normEmail] || [];
}

async function getNextExpenseId() {
  if (await ensureDB()) {
    const maxDoc = await Expense.findOne().sort({ id: -1 }).lean();
    return (maxDoc && Number.isInteger(maxDoc.id) ? maxDoc.id : 0) + 1;
  }
  const expensesMap = readJson(expensesFile, readJson(bundledExpenses, {}));
  const allExpenses = Object.values(expensesMap).flat();
  return allExpenses.reduce((max, e) => Math.max(max, e.id || 0), 0) + 1;
}

async function addExpense({ email, amount, description, category, categorySource, aiSuggested = false, userId = null }) {
  const normEmail = String(email || "").trim().toLowerCase();
  const nextId = await getNextExpenseId();
  const newRecord = {
    id: nextId,
    amount: Number(amount),
    description: String(description).trim(),
    category: String(category),
    categorySource: categorySource || "fallback",
    aiSuggested: !!aiSuggested,
    createdAt: new Date().toISOString()
  };

  if (await ensureDB()) {
    const created = await Expense.create({
      id: nextId,
      email: normEmail,
      amount: newRecord.amount,
      description: newRecord.description,
      category: newRecord.category,
      categorySource: newRecord.categorySource,
      aiSuggested: newRecord.aiSuggested
    });
    return {
      id: created.id,
      amount: created.amount,
      description: created.description,
      category: created.category,
      categorySource: created.categorySource,
      aiSuggested: created.aiSuggested,
      createdAt: created.createdAt
    };
  }

  const expensesMap = readJson(expensesFile, readJson(bundledExpenses, {}));
  const userList = expensesMap[normEmail] || [];
  userList.push(newRecord);
  expensesMap[normEmail] = userList;
  writeJson(expensesFile, expensesMap);
  return newRecord;
}

async function deleteExpense(email, expenseId) {
  const normEmail = String(email || "").trim().toLowerCase();
  const idStr = String(expenseId || "").trim();
  const idNum = Number.parseInt(idStr, 10);
  const isPureNumber = /^\d+$/.test(idStr);

  if (await ensureDB()) {
    const conditions = [
      { email: normEmail, id: idStr },
      { email: normEmail, _id: idStr }
    ];
    if (isPureNumber && Number.isInteger(idNum)) {
      conditions.push({ email: normEmail, id: idNum });
    }
    if (require("mongoose").Types.ObjectId.isValid(idStr)) {
      conditions.push({ email: normEmail, _id: new (require("mongoose").Types.ObjectId)(idStr) });
    }

    let res = await Expense.deleteOne({ $or: conditions });
    if (res.deletedCount === 0) {
      const docs = await Expense.find({ email: normEmail }).lean();
      const matched = docs.find(d => 
        String(d.id) === idStr || 
        String(d._id) === idStr || 
        (isPureNumber && d.id === idNum)
      );
      if (matched) {
        res = await Expense.deleteOne({ _id: matched._id });
      }
    }
    if (res.deletedCount === 0) {
      const err = new Error("Expense not found.");
      err.statusCode = 404;
      throw err;
    }
    return true;
  }

  const expensesMap = readJson(expensesFile, readJson(bundledExpenses, {}));
  const userList = expensesMap[normEmail] || [];
  const idx = userList.findIndex(e => 
    String(e.id) === idStr || 
    (isPureNumber && e.id === idNum) || 
    String(e._id) === idStr
  );
  if (idx === -1) {
    const err = new Error("Expense not found.");
    err.statusCode = 404;
    throw err;
  }
  userList.splice(idx, 1);
  expensesMap[normEmail] = userList;
  writeJson(expensesFile, expensesMap);
  return true;
}

async function getLeaderboard(limit = 10) {
  if (await ensureDB()) {
    const users = await User.find().lean();
    const expenses = await Expense.find().lean();
    const totalsByEmail = {};
    for (const e of expenses) {
      totalsByEmail[e.email] = (totalsByEmail[e.email] || 0) + Number(e.amount || 0);
    }
    return users
      .map(u => ({ name: u.name || "User", email: u.email, totalExpense: totalsByEmail[u.email] || 0 }))
      .sort((a, b) => b.totalExpense - a.totalExpense)
      .slice(0, limit)
      .map((u, i) => ({ rank: i + 1, ...u }));
  }
  const usersMap = readJson(usersFile, readJson(bundledUsers, {}));
  const expensesMap = readJson(expensesFile, readJson(bundledExpenses, {}));
  const totalsByEmail = {};
  for (const [email, list] of Object.entries(expensesMap)) {
    totalsByEmail[email] = (list || []).reduce((t, e) => t + Number(e.amount || 0), 0);
  }
  return Object.entries(usersMap)
    .map(([email, user]) => ({ name: user.name || "User", email, totalExpense: totalsByEmail[email] || 0 }))
    .sort((a, b) => b.totalExpense - a.totalExpense)
    .slice(0, limit)
    .map((u, i) => ({ rank: i + 1, ...u }));
}

// --- PASSWORD RESET TOKEN API ---

async function createResetToken({ email, rawToken, expiresInMs = 15 * 60 * 1000 }) {
  const record = PasswordResetToken.create({ userId: email, rawToken, expiresInMs });

  if (await ensureDB()) {
    await PasswordResetToken.MongooseModel.create({
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      createdAt: new Date(record.createdAt),
      expiresAt: new Date(record.expiresAt),
      usedAt: null
    });
    return record;
  }

  const tokensList = readJson(tokensFile, readJson(bundledTokens, []));
  tokensList.push(record);
  writeJson(tokensFile, tokensList);
  return record;
}

async function getResetTokenByHash(tokenHash) {
  if (!tokenHash) return null;
  if (await ensureDB()) {
    const doc = await PasswordResetToken.MongooseModel.findOne({ tokenHash }).lean();
    if (!doc) return null;
    return {
      id: doc.id,
      userId: doc.userId,
      tokenHash: doc.tokenHash,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
      usedAt: doc.usedAt ? new Date(doc.usedAt).toISOString() : null
    };
  }

  const tokensList = readJson(tokensFile, readJson(bundledTokens, []));
  const record = tokensList.find(t => t.tokenHash === tokenHash);
  return record || null;
}

async function markTokenUsed(tokenIdOrHash) {
  const nowStr = new Date().toISOString();
  if (await ensureDB()) {
    await PasswordResetToken.MongooseModel.updateOne(
      { $or: [{ id: tokenIdOrHash }, { tokenHash: tokenIdOrHash }] },
      { usedAt: new Date() }
    );
    return true;
  }

  const tokensList = readJson(tokensFile, readJson(bundledTokens, []));
  const record = tokensList.find(t => t.id === tokenIdOrHash || t.tokenHash === tokenIdOrHash);
  if (record) {
    record.usedAt = nowStr;
    writeJson(tokensFile, tokensList);
  }
  return true;
}

module.exports = {
  getUser,
  createUser,
  updateUserPassword,
  getExpenses,
  addExpense,
  deleteExpense,
  getLeaderboard,
  createResetToken,
  getResetTokenByHash,
  markTokenUsed,
  connectDB
};
