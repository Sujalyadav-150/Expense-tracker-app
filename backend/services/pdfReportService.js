const PDFDocument = require("pdfkit");

function createPdfReport(report) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.fontSize(20).fillColor("#17212b").text("Expense Tracker Report");
    document.moveDown(0.35);
    document.fontSize(10).fillColor("#58636d").text(`User: ${report.userName}`);
    document.text(`Period: ${report.periodLabel} | ${report.dateRange}`);
    document.moveDown();

    const cards = [
      ["Total Income", report.totalIncome, "#157347"],
      ["Total Expense", report.totalExpense, "#b02a37"],
      ["Net Savings", report.savings, "#0d6efd"]
    ];
    const cardWidth = (document.page.width - 80 - 20) / 3;
    cards.forEach(([label, value, color], index) => {
      const x = 40 + index * (cardWidth + 10);
      document.roundedRect(x, document.y, cardWidth, 52, 6).fill("#f4f6f8");
      document.fillColor(color).fontSize(9).text(label, x + 10, document.y + 10);
      document.fontSize(14).text(`₹${Number(value).toFixed(2)}`, x + 10, document.y + 26);
    });
    document.y += 68;

    const columns = [
      ["Date", 72],
      ["Description", 190],
      ["Category", 90],
      ["Type", 70],
      ["Amount", 80]
    ];
    const drawRow = (values, header = false) => {
      let x = 40;
      const y = document.y;
      if (header) document.rect(40, y - 4, 502, 22).fill("#e9ecef");
      values.forEach((value, index) => {
        document.fillColor(header ? "#17212b" : "#343a40")
          .fontSize(header ? 8 : 8)
          .text(String(value), x, y, { width: columns[index][1], ellipsis: true });
        x += columns[index][1];
      });
      document.y = y + 20;
    };

    drawRow(columns.map(([label]) => label), true);
    report.transactions.forEach((transaction) => {
      if (document.y > 760) {
        document.addPage();
        document.y = 40;
        drawRow(columns.map(([label]) => label), true);
      }
      drawRow([
        new Date(transaction.createdAt).toLocaleDateString("en-IN"),
        transaction.description,
        transaction.category || "Other",
        transaction.type,
        `₹${transaction.amount.toFixed(2)}`
      ]);
    });

    document.end();
  });
}

module.exports = { createPdfReport };