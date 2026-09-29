const mongoose = require("mongoose");
const { connectDB } = require("../config/database");
const User = require("../models/User");
const Expense = require("../models/Expense");
const Order = require("../models/Order");
const PasswordResetToken = require("../models/PasswordResetToken");

async function ensureDatabase() {
  await connectDB();
}

function isDatabaseError(error) {
  return Boolean(
    error?.name === "MongoServerSelectionError" ||
    error?.name === "MongoNetworkError" ||
    error?.name === "MongooseServerSelectionError" ||
    error?.name === "MongoParseError" ||
    error?.code === "ENOTFOUND" ||
    error?.code === "ECONNREFUSED" ||
    error?.message?.includes("querySrv") ||
    error?.message?.includes("mongodb+srv URI cannot have port number") ||
    error?.message?.includes("MONGODB_URI") ||
    error?.message?.includes("MongoDB")
  );
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function getUser(email) {
  await ensureDatabase();
  const user = await User.findOne({ email: normalizeEmail(email) }).lean();
  return user
    ? {
        id: String(user._id),
        name: user.name || "User",
        password: user.password,
        email: user.email,
        isPremium: Boolean(user.isPremium),
        ispremiumuser: Boolean(user.ispremiumuser || user.isPremium)
      }
    : null;
}

async function createUser({ name, email, password, isPremium = false }) {
  await ensureDatabase();
  try {
    const user = await User.create({
      email: normalizeEmail(email),
      name: String(name || "").trim() || "User",
      password,
      isPremium
    });
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      isPremium: Boolean(user.isPremium),
      ispremiumuser: Boolean(user.ispremiumuser || user.isPremium)
    };
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = new Error("An account with this email already exists.");
      duplicate.statusCode = 409;
      throw duplicate;
    }
    throw error;
  }
}

async function updateUserPassword(email, hashedPassword) {
  await ensureDatabase();
  const user = await User.findOneAndUpdate(
    { email: normalizeEmail(email) },
    { password: hashedPassword },
    { new: true }
  );
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }
  return true;
}

async function createPremiumOrder({ userId, email, orderId, amount = 199, paymentSessionId }) {
  await ensureDatabase();
  return Order.create({
    userId,
    email: normalizeEmail(email),
    orderId,
    amount: Number(amount),
    paymentSessionId,
    status: "PENDING"
  });
}

async function updatePremiumOrder(orderId, email, status) {
  await ensureDatabase();
  return Order.findOneAndUpdate(
    {
      orderId,
      email: normalizeEmail(email),
      // A verified successful payment is terminal. A later client retry or
      // failure callback must never downgrade a paid order.
      ...(status === "FAILED" ? { status: { $ne: "SUCCESSFUL" } } : {})
    },
    { status },
    { new: true }
  ).lean();
}

async function getPremiumOrder(orderId, email) {
  await ensureDatabase();
  return Order.findOne({
    orderId: String(orderId || "").trim(),
    email: normalizeEmail(email)
  }).lean();
}

async function markUserPremium(email) {
  await ensureDatabase();
  const user = await User.findOneAndUpdate(
    { email: normalizeEmail(email) },
    { isPremium: true, ispremiumuser: true },
    { new: true }
  ).lean();
  return user
    ? {
        id: String(user._id),
        name: user.name || "User",
        email: user.email,
        isPremium: true,
        ispremiumuser: true
      }
    : null;
}

async function getExpensesInRange(email, start, end) {
  await ensureDatabase();
  const expenses = await Expense.find({
    email: normalizeEmail(email),
    createdAt: { $gte: start, $lt: end }
  })
    .select({ _id: 0, id: 1, amount: 1, description: 1, category: 1, categorySource: 1, aiSuggested: 1, createdAt: 1 })
    .sort({ createdAt: 1, id: 1 })
    .lean();
  return expenses.map((expense) => ({
    id: expense.id,
    amount: Number(expense.amount || 0),
    description: expense.description,
    category: expense.category,
    categorySource: expense.categorySource || "fallback",
    aiSuggested: Boolean(expense.aiSuggested),
    createdAt: expense.createdAt
  }));
}

async function getExpenses(email) {
  await ensureDatabase();
  const expenses = await Expense.find({ email: normalizeEmail(email) })
    .select({ _id: 0, id: 1, amount: 1, description: 1, category: 1, categorySource: 1, aiSuggested: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .lean();
  return expenses.map((expense) => ({
    id: expense.id,
    amount: expense.amount,
    description: expense.description,
    category: expense.category,
    categorySource: expense.categorySource || "fallback",
    aiSuggested: Boolean(expense.aiSuggested),
    createdAt: expense.createdAt
  }));
}

async function getExpensesPage(email, { page = 1, limit = 10 } = {}) {
  await ensureDatabase();
  const filter = { email: normalizeEmail(email) };
  const [totalExpenses, totals] = await Promise.all([
    Expense.countDocuments(filter),
    Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
    ])
  ]);
  const totalPages = Math.ceil(totalExpenses / limit);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const expenses = await Expense.find(filter)
    .select({ _id: 0, id: 1, amount: 1, description: 1, category: 1, categorySource: 1, aiSuggested: 1, createdAt: 1 })
    .sort({ createdAt: -1, _id: -1 })
    .skip((currentPage - 1) * limit)
    .limit(limit)
    .lean();

  return {
    expenses: expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      categorySource: expense.categorySource || "fallback",
      aiSuggested: Boolean(expense.aiSuggested),
      createdAt: expense.createdAt
    })),
    pagination: {
      currentPage,
      pageSize: limit,
      totalExpenses,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    },
    totalAmount: Number(totals[0]?.totalAmount || 0)
  };
}

function makeExpenseId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

async function addExpense({ email, userId = null, amount, description, category, categorySource, aiSuggested = false }) {
  await ensureDatabase();
  const expense = await Expense.create({
    id: makeExpenseId(),
    email: normalizeEmail(email),
    userId: userId ? String(userId) : null,
    amount: Number(amount),
    description: String(description).trim(),
    category: String(category),
    categorySource: categorySource || "fallback",
    aiSuggested: Boolean(aiSuggested)
  });
  return {
    id: expense.id,
    amount: expense.amount,
    description: expense.description,
    category: expense.category,
    categorySource: expense.categorySource,
    aiSuggested: expense.aiSuggested,
    createdAt: expense.createdAt
  };
}

async function deleteExpense(email, expenseId) {
  await ensureDatabase();
  const id = String(expenseId || "").trim();
  const emailFilter = normalizeEmail(email);
  const conditions = [{ email: emailFilter, id }];
  if (/^\d+$/.test(id)) conditions.push({ email: emailFilter, id: Number(id) });
  if (/^[a-fA-F0-9]{24}$/.test(id)) conditions.push({ email: emailFilter, _id: id });

  const result = await Expense.deleteOne({ $or: conditions });
  if (!result.deletedCount) {
    const error = new Error("Expense not found.");
    error.statusCode = 404;
    throw error;
  }
  return true;
}

async function getLeaderboard(currentEmail) {
  await ensureDatabase();
  return User.aggregate([
    {
      $lookup: {
        from: Expense.collection.name,
        let: { userEmail: "$email" },
        pipeline: [
          { $match: { $expr: { $eq: ["$email", "$$userEmail"] } } },
          {
            $group: {
              _id: null,
              totalExpense: { $sum: "$amount" },
              expenseCount: { $sum: 1 }
            }
          }
        ],
        as: "expenseSummary"
      }
    },
    {
      $match: {
        $expr: {
          $and: [
            {
              $not: {
                $regexMatch: {
                  input: { $toLower: { $ifNull: ["$name", ""] } },
                  regex: "(^|[^a-z])(nitin|ansh|anki|dummy|test)([^a-z]|$)"
                }
              }
            },
            {
              $not: {
                $regexMatch: {
                  input: { $toLower: { $ifNull: ["$email", ""] } },
                  regex: "(dummy|test|example)\\.(com|net|org)$"
                }
              }
            },
            {
              $or: [
                {
                  $not: {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$name", ""] } },
                      regex: "^prem"
                    }
                  }
                },
                { $eq: [{ $toLower: "$email" }, "prem9771190912@gmail.com"] }
              ]
            }
          ]
        }
      }
    },
    {
      $project: {
        _id: 0,
        id: { $toString: "$_id" },
        name: { $ifNull: ["$name", "User"] },
        email: 1,
        totalExpense: {
          $ifNull: [{ $arrayElemAt: ["$expenseSummary.totalExpense", 0] }, 0]
        },
        expenseCount: {
          $ifNull: [{ $arrayElemAt: ["$expenseSummary.expenseCount", 0] }, 0]
        }
      }
    },
    { $sort: { totalExpense: -1, expenseCount: -1, name: 1, id: 1 } }
  ]).then((rows) => rows.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    name: row.name,
    isCurrentUser: normalizeEmail(row.email) === normalizeEmail(currentEmail),
    totalExpense: Number(row.totalExpense || 0),
    expenseCount: Number(row.expenseCount || 0)
  })));
}

async function createResetToken({ email, rawToken, expiresInMs = 900000 }) {
  await ensureDatabase();
  const record = PasswordResetToken.create({ userId: email, rawToken, expiresInMs });
  await PasswordResetToken.MongooseModel.create({
    ...record,
    createdAt: new Date(record.createdAt),
    expiresAt: new Date(record.expiresAt)
  });
  return record;
}

async function getResetTokenByHash(tokenHash) {
  await ensureDatabase();
  const token = await PasswordResetToken.MongooseModel.findOne({ tokenHash }).lean();
  return token
    ? {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        usedAt: token.usedAt
      }
    : null;
}

async function markTokenUsed(idOrHash) {
  await ensureDatabase();
  await PasswordResetToken.MongooseModel.updateOne(
    { $or: [{ id: idOrHash }, { tokenHash: idOrHash }] },
    { usedAt: new Date() }
  );
  return true;
}

module.exports = {
  getUser,
  createUser,
  updateUserPassword,
  createPremiumOrder,
  updatePremiumOrder,
  getPremiumOrder,
  markUserPremium,
  getExpenses,
  getExpensesPage,
  getExpensesInRange,
  addExpense,
  deleteExpense,
  getLeaderboard,
  createResetToken,
  getResetTokenByHash,
  markTokenUsed,
  connectDB,
  isDatabaseError,
  isConnected: () => mongoose.connection.readyState === 1
};
