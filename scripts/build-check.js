const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "api/index.js",
  "backend/app.js",
  "backend/server.js",
  "frontend/login.html",
  "frontend/expenses.html",
  "frontend/report.html",
  "frontend/js/expenses.js",
  "frontend/js/report.js",
  "vercel.json"
];

for (const relativePath of requiredFiles) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing production asset: ${relativePath}`);
  }
}

const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
if (!vercel.routes?.some((route) => route.dest === "api/index.js")) {
  throw new Error("Vercel routing does not point to api/index.js.");
}

for (const relativePath of requiredFiles.filter((file) => file.endsWith(".js"))) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  if (!source.trim()) throw new Error(`Empty production asset: ${relativePath}`);
}

console.log(`Production build check passed (${requiredFiles.length} required assets).`);