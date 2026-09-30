/* =============================================================================
   report.js — Expense Report page
   Handles: period tabs, date picker, client-side filtering, KPI display,
            CSV/PDF download (premium-gated, server-side generation).
   Security: never sends userId from frontend — all server routes use req.user
             from the JWT, so only the logged-in user's expenses are accessible.
   ============================================================================= */

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const reportRows         = document.getElementById("reportRows");
const reportStatus       = document.getElementById("reportStatus");
const reportPeriodLabel  = document.getElementById("reportPeriodLabel");
const downloadCsvBtn     = document.getElementById("downloadCsvBtn");
const downloadPdfBtn     = document.getElementById("downloadPdfBtn");
const premiumNotice      = document.getElementById("premiumNotice");
const reportBuyPremiumBtn = document.getElementById("reportBuyPremiumBtn");
const premiumBadge       = document.getElementById("premiumBadge");
const reportDateInput    = document.getElementById("reportDate");
const notificationBanner = document.getElementById("notificationBanner");
const periodButtons      = [...document.querySelectorAll("[data-period]")];
const totalExpenseEl     = document.getElementById("totalExpense");
const txCountEl          = document.getElementById("transactionCount");
const categoryCountEl    = document.getElementById("categoryCount");

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const authToken = localStorage.getItem("authToken") || localStorage.getItem("expenseTrackerToken");

if (!authToken) {
  window.location.href = "login.html";
}

function authHeaders() {
  return authToken ? { "Authorization": `Bearer ${authToken}` } : {};
}

function clearStoredAuth() {
  ["authToken","expenseTrackerToken","loggedInUser","expenseTrackerUser"].forEach(k => localStorage.removeItem(k));
}

// ---------------------------------------------------------------------------
// Notification helpers
// ---------------------------------------------------------------------------
let _notifTimer = null;
function showNotification(message, type = "info") {
  notificationBanner.textContent = message;
  notificationBanner.className   = `notification-banner notification-${type}`;
  notificationBanner.hidden      = false;
  clearTimeout(_notifTimer);
  _notifTimer = setTimeout(() => { notificationBanner.hidden = true; }, 5000);
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------
async function apiJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  let result = {};
  try { result = await response.json(); } catch { /* non-JSON */ }
  if (response.status === 401) {
    clearStoredAuth();
    window.location.href = "login.html";
    throw new Error("Session expired. Please log in again.");
  }
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status}).`);
  return result;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let expenses       = [];
let isPremium      = null;
let isLoading      = true;
let reportLoaded   = false;
let selectedPeriod = "daily";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getSelectedDate() {
  const v = reportDateInput.value;
  if (!v) return new Date();
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? new Date() : dt;
}

function getPeriodRange(period, anchor = new Date()) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (period === "daily") {
    end.setDate(end.getDate() + 1);
  } else if (period === "weekly") {
    start.setDate(start.getDate() - start.getDay());   // Sunday start
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
  } else if (period === "monthly") {
    start.setDate(1);
    end.setTime(start.getTime());
    end.setMonth(end.getMonth() + 1);
  } else {  // yearly
    start.setMonth(0, 1);
    end.setTime(start.getTime());
    end.setFullYear(end.getFullYear() + 1);
  }
  return { start, end };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function buildPeriodLabel(period, range) {
  if (period === "daily")   return `Daily report · ${formatDate(range.start)}`;
  if (period === "weekly") {
    const lastDay = new Date(range.end); lastDay.setDate(lastDay.getDate() - 1);
    return `Weekly report · ${formatDate(range.start)} – ${formatDate(lastDay)}`;
  }
  if (period === "monthly") {
    return `Monthly report · ${new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(range.start)}`;
  }
  return `Yearly report · ${range.start.getFullYear()}`;
}


// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Render the report for the selected period
// ---------------------------------------------------------------------------
function renderReport() {
  const range  = getPeriodRange(selectedPeriod, getSelectedDate());
  reportPeriodLabel.textContent = buildPeriodLabel(selectedPeriod, range);

  periodButtons.forEach(btn => {
    btn.setAttribute("aria-pressed", String(btn.dataset.period === selectedPeriod));
    btn.disabled = isLoading;
  });
  reportDateInput.disabled = isLoading;

  // Filter to selected period.
  const rows = expenses
    .map(exp => ({ exp, date: exp.createdAt ? new Date(exp.createdAt) : null }))
    .filter(({ date }) => date && !isNaN(date.getTime()) && date >= range.start && date < range.end)
    .sort((a, b) => b.date - a.date);

  // Expense-only summary.
  const totalExpense = rows.reduce((sum, { exp }) => sum + (Number(exp.amount) || 0), 0);
  const categories = new Set(rows.map(({ exp }) => String(exp.category || "Other").trim()).filter(Boolean));

  totalExpenseEl.textContent = formatCurrency(totalExpense);
  txCountEl.textContent = String(rows.length);
  categoryCountEl.textContent = String(categories.size);

  // Table rows.
  if (!rows.length) {
    reportRows.innerHTML = `<tr><td colspan="4" class="report-empty">No expenses found for this period.</td></tr>`;
  } else {
    reportRows.innerHTML = rows.map(({ exp, date }) => {
      const amt = Number(exp.amount) || 0;
      return `<tr>
        <td>${escapeHtml(formatDate(date))}</td>
        <td>${escapeHtml(exp.description)}</td>
        <td><span class="category-chip">${escapeHtml(exp.category || "Other")}</span></td>
        <td class="amount-cell">${escapeHtml(formatCurrency(amt))}</td>
      </tr>`;
    }).join("");
  }

  updateDownloadState();
}

// ---------------------------------------------------------------------------
// Download button state
// ---------------------------------------------------------------------------
function updateDownloadState() {
  // Keep download buttons clickable for free users so we can show the
  // premium gate instead of silently disabling the action.
  const canDownload = isPremium === true && reportLoaded && !isLoading;
  const canAttempt   = reportLoaded && !isLoading;
  downloadCsvBtn.disabled = !canAttempt;
  downloadPdfBtn.disabled = !canAttempt;
  downloadCsvBtn.classList.toggle("report-locked", isPremium === false && canAttempt);
  downloadPdfBtn.classList.toggle("report-locked", isPremium === false && canAttempt);

  const periodLabel = selectedPeriod[0].toUpperCase() + selectedPeriod.slice(1);
  downloadCsvBtn.textContent = `📥 Download ${periodLabel}_Report.csv`;
  downloadPdfBtn.textContent = `📄 Download ${periodLabel}_Report.pdf`;

  // Premium notice is visible automatically for Standard users.
  // Premium users never see the upgrade gate.
  if (premiumBadge) premiumBadge.hidden = !isPremium;
  if (premiumNotice) {
    premiumNotice.hidden = !(isPremium === false && canAttempt);
  }
}

// ---------------------------------------------------------------------------
// Load all expenses + session
// ---------------------------------------------------------------------------
async function loadExpenses() {
  isLoading      = true;
  reportLoaded   = false;
  reportStatus.textContent = "Loading report…";
  updateDownloadState();

  try {
    // Parallel: fetch session (for premium status) + first page of expenses.
    const [session, firstPage] = await Promise.all([
      apiJson("/api/auth/me"),
      apiJson("/api/expenses?page=1&limit=40")
    ]);

    isPremium = session.user?.isPremium === true || session.user?.ispremiumuser === true;
    expenses  = Array.isArray(firstPage.expenses) ? [...firstPage.expenses] : [];

    // Fetch remaining pages sequentially. The report download endpoint still
    // re-queries the authenticated user's date range on the server, so this
    // browser copy is only for the on-screen preview.
    const totalPages = Number(firstPage.pagination?.totalPages) || 1;
    for (let page = 2; page <= totalPages; page++) {
      const result = await apiJson(`/api/expenses?page=${page}&limit=40`);
      if (!Array.isArray(result.expenses)) throw new Error("Invalid expenses response.");
      expenses.push(...result.expenses);
    }

    reportLoaded             = true;
    reportStatus.textContent = "";
  } catch (err) {
    reportLoaded             = false;
    reportStatus.textContent = err.message || "Unable to load report data.";
    reportRows.innerHTML = `<tr><td class="report-empty" colspan="4">Unable to load report data. Please try again.</td></tr>`;
  } finally {
    isLoading = false;
    renderReport();
  }
}

// ---------------------------------------------------------------------------
// Download (CSV or PDF) — server-side generation, premium-gated on server too
// ---------------------------------------------------------------------------
function showPremiumGate() {
  if (!premiumNotice) return;
  premiumNotice.hidden = false;
  premiumNotice.scrollIntoView({ behavior: "smooth", block: "center" });
  if (reportBuyPremiumBtn) setTimeout(() => reportBuyPremiumBtn.focus(), 250);
}

async function downloadReportFile(format, btn) {
  if (isPremium === false) {
    showPremiumGate();
    return;
  }
  if (!isPremium || isLoading || !reportLoaded) return;

  const periodLabel = selectedPeriod[0].toUpperCase() + selectedPeriod.slice(1);
  const filename    = `${periodLabel}_Report.${format}`;
  const origText    = btn.textContent;
  btn.disabled      = true;
  btn.textContent   = `Preparing ${filename}…`;

  try {
    const params = new URLSearchParams({
      period: selectedPeriod,
      date:   reportDateInput.value || toDateInputValue(new Date()),
      format
    });

    const response = await fetch(`/api/expenses/report?${params.toString()}`, {
      headers: authHeaders()
    });

    if (response.status === 401) {
      clearStoredAuth();
      window.location.href = "login.html";
      return;
    }

    // The server returns JSON (not a file) if the period has no expenses.
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      const json = await response.json();
      showNotification(json.message || "No data to download.", "error");
      return;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Download failed (${response.status}).`);
    }

    const blob        = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const match       = disposition.match(/filename="([^"]+)"/i);
    const dlName      = match?.[1] || filename;

    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = dlName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 1000);

    showNotification(`${dlName} downloaded successfully.`, "success");
  } catch (err) {
    showNotification(err.message || "Download failed.", "error");
  } finally {
    btn.textContent = origText;
    updateDownloadState();
  }
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
periodButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isLoading) return;
    selectedPeriod = btn.dataset.period;
    renderReport();
  });
});

reportDateInput.addEventListener("change", () => {
  if (!isLoading) renderReport();
});

downloadCsvBtn.addEventListener("click", () => downloadReportFile("csv", downloadCsvBtn));

downloadPdfBtn.addEventListener("click", () => downloadReportFile("pdf", downloadPdfBtn));
reportBuyPremiumBtn?.addEventListener("click", purchasePremiumFromReport);

async function purchasePremiumFromReport() {
  if (isPremium === true) return;

  if (!reportBuyPremiumBtn) return;
  const originalText = reportBuyPremiumBtn.textContent;
  reportBuyPremiumBtn.disabled = true;
  reportBuyPremiumBtn.textContent = "Creating order…";

  try {
    const order = await apiJson("/api/purchase/premium", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (order.mode === "sandbox_simulation") {
      const paid = window.confirm(
        `Cashfree Sandbox Simulation\\n\\nOrder ID: ${order.order_id}\\nAmount: ₹${Number(order.amount || 199).toFixed(2)}\\n\\nClick OK to simulate a successful payment.`
      );
      if (!paid) {
        await apiJson("/api/purchase/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.order_id, status: "FAILED", testSuccess: false })
        }).catch(() => {});
        throw new Error("Payment cancelled.");
      }

      const result = await apiJson("/api/purchase/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.order_id, status: "SUCCESSFUL", testSuccess: true })
      });
      if (!result.success) throw new Error(result.message || "Payment verification failed.");
      activatePremiumLocally(result);
      return;
    }

    if (typeof Cashfree !== "function") {
      throw new Error("Cashfree checkout is not available. Please refresh the page.");
    }

    const cashfree = Cashfree({
      mode: order.cashfree_env === "production" ? "production" : "sandbox"
    });

    // Open Cashfree's hosted checkout immediately from the user's button click.
    const result = await cashfree.checkout({
      paymentSessionId: order.payment_session_id,
      // Send the user directly to Cashfree's hosted payment page.
      // This is more reliable on mobile browsers than the popup/modal flow.
      redirectTarget: "_self"
    });

    if (result?.error || result?.paymentDetails?.paymentStatus === "FAILED") {
      await apiJson("/api/purchase/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.order_id, status: "FAILED", testSuccess: false })
      }).catch(() => {});
      throw new Error(result?.error?.message || "Payment failed or was cancelled.");
    }

    const verified = await apiJson("/api/purchase/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.order_id, status: "SUCCESSFUL" })
    });

    if (!verified.success) {
      throw new Error(verified.message || "Payment verification failed.");
    }

    activatePremiumLocally(verified);
  } catch (err) {
    if (err?.message !== "Payment cancelled.") {
      showNotification(err.message || "Unable to start Premium payment.", "error");
    }
  } finally {
    reportBuyPremiumBtn.disabled = false;
    reportBuyPremiumBtn.textContent = originalText;
  }
}

function activatePremiumLocally(result) {
  isPremium = true;
  if (result.token) {
    localStorage.setItem("authToken", result.token);
    localStorage.setItem("expenseTrackerToken", result.token);
  }
  if (result.user) {
    localStorage.setItem("loggedInUser", JSON.stringify(result.user));
    localStorage.setItem("expenseTrackerUser", JSON.stringify(result.user));
  }
  if (premiumNotice) premiumNotice.hidden = true;
  showNotification("🎉 Premium activated. CSV and PDF downloads are now unlocked.", "success");
  renderReport();
}


// Cashfree Premium checkout is intentionally opened in the current tab.
// ---------------------------------------------------------------------------
// Initialise
// ---------------------------------------------------------------------------
reportDateInput.value = toDateInputValue(new Date());
loadExpenses();
