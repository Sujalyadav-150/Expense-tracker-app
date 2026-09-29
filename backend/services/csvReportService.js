function csvCell(value) {
  let safeValue = String(value ?? "");
  if (/^[=+\-@]/.test(safeValue)) safeValue = `'${safeValue}`;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function createCsvReport(report) {
  const rows = [
    ["User Name", report.userName],
    ["Selected Period", report.periodLabel],
    ["Date Range", report.dateRange],
    ["Total Income", report.totalIncome.toFixed(2)],
    ["Total Expense", report.totalExpense.toFixed(2)],
    ["Savings", report.savings.toFixed(2)],
    [],
    ["Date", "Description", "Category", "Type", "Amount (INR)"],
    ...report.transactions.map((transaction) => [
      new Date(transaction.createdAt).toLocaleDateString("en-IN"),
      transaction.description,
      transaction.category || "Other",
      transaction.type,
      transaction.amount.toFixed(2)
    ])
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

module.exports = { createCsvReport };