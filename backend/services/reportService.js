const db = require("../utils/db");

const PERIODS = new Set(["daily", "weekly", "monthly", "yearly"]);

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function parseAnchorDate(value) {
  if (!value) return startOfDay(new Date());
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return startOfDay(new Date());
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function getPeriodRange(period, dateValue) {
  const selectedPeriod = PERIODS.has(period) ? period : "daily";
  const anchor = parseAnchorDate(dateValue);
  const start = startOfDay(anchor);
  const end = new Date(start);

  if (selectedPeriod === "daily") {
    end.setDate(end.getDate() + 1);
  } else if (selectedPeriod === "weekly") {
    start.setDate(start.getDate() - start.getDay());
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
  } else if (selectedPeriod === "monthly") {
    start.setDate(1);
    end.setTime(start.getTime());
    end.setMonth(end.getMonth() + 1);
  } else {
    start.setMonth(0, 1);
    end.setTime(start.getTime());
    end.setFullYear(end.getFullYear() + 1);
  }

  return {
    period: selectedPeriod,
    start,
    end,
    label: selectedPeriod[0].toUpperCase() + selectedPeriod.slice(1),
    fileName: `${selectedPeriod[0].toUpperCase() + selectedPeriod.slice(1)}_Report`
  };
}

function isIncome(expense) {
  return String(expense.type || "").toLowerCase() === "income"
    || String(expense.category || "").toLowerCase() === "salary";
}

async function buildReport(email, name, period, dateValue) {
  const range = getPeriodRange(period, dateValue);
  const expenses = await db.getExpensesInRange(email, range.start, range.end);
  const transactions = expenses.map((expense) => ({
    ...expense,
    type: isIncome(expense) ? "Income" : "Expense"
  }));
  const totals = transactions.reduce((result, transaction) => {
    if (transaction.type === "Income") result.income += transaction.amount;
    else result.expense += transaction.amount;
    return result;
  }, { income: 0, expense: 0 });

  return {
    userName: name || "User",
    period: range.period,
    periodLabel: range.label,
    fileName: range.fileName,
    start: range.start,
    end: range.end,
    dateRange: `${range.start.toLocaleDateString("en-IN")} - ${new Date(range.end.getTime() - 1).toLocaleDateString("en-IN")}`,
    transactions,
    totalIncome: Number(totals.income.toFixed(2)),
    totalExpense: Number(totals.expense.toFixed(2)),
    savings: Number((totals.income - totals.expense).toFixed(2))
  };
}

module.exports = { PERIODS, getPeriodRange, buildReport, isIncome };