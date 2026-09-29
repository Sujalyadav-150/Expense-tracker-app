const reportRows = document.getElementById("reportRows");
const reportStatus = document.getElementById("reportStatus");
const reportPeriodLabel = document.getElementById("reportPeriodLabel");
const downloadButton = document.getElementById("downloadReport");
const pdfButton = document.getElementById("downloadPdf");
const premiumNotice = document.getElementById("premiumNotice");
const reportDateInput = document.getElementById("reportDate");
const periodButtons = [...document.querySelectorAll("[data-period]")];
const authToken = localStorage.getItem("authToken") || localStorage.getItem("expenseTrackerToken");

let expenses = [];
let isPremium = null;
let isLoading = true;
let reportLoaded = false;
let selectedPeriod = "daily";
let visibleRows = [];
let visibleTotals = { income: 0, expense: 0 };

function authHeaders() {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function apiJson(url) {
    const response = await fetch(url, { headers: authHeaders() });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("expenseTrackerToken");
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("expenseTrackerUser");
        window.location.href = "/";
        throw new Error("Your session expired. Please login again.");
    }
    if (!response.ok) throw new Error(result.message || "Unable to load report data.");
    return result;
}

function formatCurrency(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(date) {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getSelectedReportDate() {
    const value = reportDateInput.value;
    if (!value) return new Date();

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getRecordDate(expense) {
    const date = new Date(expense.createdAt || expense.date || "");
    return Number.isNaN(date.getTime()) ? null : date;
}

function getPeriodRange(period, anchorDate = new Date()) {
    const start = new Date(anchorDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);

    if (period === "daily") {
        end.setDate(end.getDate() + 1);
    } else if (period === "weekly") {
        start.setDate(start.getDate() - start.getDay());
        end.setTime(start.getTime());
        end.setDate(end.getDate() + 7);
    } else if (period === "monthly") {
        start.setDate(1);
        end.setTime(start.getTime());
        end.setMonth(end.getMonth() + 1);
    } else {
        start.setMonth(0, 1);
        end.setTime(start.getTime());
        end.setFullYear(end.getFullYear() + 1);
    }

    return { start, end };
}

function periodLabel(period, range) {
    if (period === "daily") return `Daily report · ${formatDate(range.start)}`;
    if (period === "weekly") {
        const lastDay = new Date(range.end);
        lastDay.setDate(lastDay.getDate() - 1);
        return `Weekly report · ${formatDate(range.start)} – ${formatDate(lastDay)}`;
    }
    if (period === "monthly") {
        return `Monthly report · ${new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(range.start)}`;
    }
    return `Yearly report · ${new Intl.DateTimeFormat("en-IN", { year: "numeric" }).format(range.start)}`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function setDownloadState() {
    downloadButton.disabled = !isPremium || isLoading || !reportLoaded;
    pdfButton.disabled = !isPremium || isLoading || !reportLoaded;
    downloadButton.textContent = `📥 Download ${periodFileName("csv")}`;
    pdfButton.textContent = `📄 Download ${periodFileName("pdf")}`;
    premiumNotice.hidden = isPremium !== false;
    premiumNotice.textContent = isPremium === false ? "Download disabled: Premium membership is required." : "";
}

function renderReport() {
    const range = getPeriodRange(selectedPeriod, getSelectedReportDate());
    reportPeriodLabel.textContent = periodLabel(selectedPeriod, range);
    periodButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.period === selectedPeriod));
        button.disabled = isLoading;
    });
    reportDateInput.disabled = isLoading;

    visibleRows = expenses
        .map((expense) => ({ expense, date: getRecordDate(expense) }))
        .filter(({ date }) => date && date >= range.start && date < range.end)
        .sort((left, right) => right.date - left.date);

    visibleTotals = visibleRows.reduce((totals, { expense }) => {
        const amount = Number(expense.amount) || 0;
        if (String(expense.type || "").toLowerCase() === "income" || String(expense.category || "").toLowerCase() === "salary") {
            totals.income += amount;
        } else {
            totals.expense += amount;
        }
        return totals;
    }, { income: 0, expense: 0 });

    document.getElementById("totalIncome").textContent = formatCurrency(visibleTotals.income);
    document.getElementById("totalExpense").textContent = formatCurrency(visibleTotals.expense);
    document.getElementById("totalSavings").textContent = formatCurrency(visibleTotals.income - visibleTotals.expense);

    if (visibleRows.length === 0) {
        reportRows.innerHTML = '<tr><td class="report-empty" colspan="5">No report entries for this period.</td></tr>';
    } else {
        reportRows.innerHTML = visibleRows.map(({ expense, date }) => {
            const amount = Number(expense.amount) || 0;
            const income = String(expense.type || "").toLowerCase() === "income" || String(expense.category || "").toLowerCase() === "salary";
            return `<tr>
                <td>${escapeHtml(formatDate(date))}</td>
                <td>${escapeHtml(expense.description)}</td>
                <td>${escapeHtml(expense.category || "Other")}</td>
                <td>${income ? escapeHtml(formatCurrency(amount)) : "—"}</td>
                <td>${income ? "—" : escapeHtml(formatCurrency(amount))}</td>
            </tr>`;
        }).join("");
    }

    setDownloadState();
}

async function loadExpenses() {
    if (!authToken) {
        window.location.href = "/";
        return;
    }

    isLoading = true;
    reportStatus.textContent = "Loading report...";
    setDownloadState();

    try {
        const [session, firstPage] = await Promise.all([
            apiJson("/api/auth/me"),
            apiJson("/api/expenses?page=1&limit=40")
        ]);
        isPremium = session.user?.isPremium === true || session.user?.ispremiumuser === true;
        expenses = Array.isArray(firstPage.expenses) ? [...firstPage.expenses] : [];

        const totalPages = Number(firstPage.pagination?.totalPages) || 0;
        for (let page = 2; page <= totalPages; page += 1) {
            const result = await apiJson(`/api/expenses?page=${page}&limit=40`);
            if (!Array.isArray(result.expenses)) throw new Error("The expenses response was invalid.");
            expenses.push(...result.expenses);
        }

        reportLoaded = true;
        reportStatus.textContent = "";
        renderReport();
    } catch (error) {
        reportLoaded = false;
        reportStatus.textContent = error.message || "Unable to load report data.";
        reportRows.innerHTML = '<tr><td class="report-empty" colspan="5">Unable to load report data. Please try again.</td></tr>';
    } finally {
        isLoading = false;
        if (reportLoaded) renderReport();
        else setDownloadState();
    }
}

function periodFileName(extension) {
    const label = selectedPeriod[0].toUpperCase() + selectedPeriod.slice(1);
    return `${label}_Report.${extension}`;
}

async function downloadReportFile(format, button) {
    if (!isPremium || isLoading || !reportLoaded) return;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = `Preparing ${periodFileName(format)}...`;

    try {
        const params = new URLSearchParams({
            period: selectedPeriod,
            date: reportDateInput.value || toDateInputValue(new Date()),
            format
        });
        const response = await fetch(`/api/expenses/report?${params.toString()}`, { headers: authHeaders() });
        if (response.status === 401) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("expenseTrackerToken");
            window.location.href = "/";
            return;
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || "Unable to download report.");
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition") || "";
        const filenameMatch = disposition.match(/filename="([^"]+)"/i);
        const filename = filenameMatch?.[1] || periodFileName(format);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        window.setTimeout(() => {
            link.remove();
            URL.revokeObjectURL(blobUrl);
        }, 1000);
        reportStatus.textContent = `${filename} downloaded.`;
    } catch (error) {
        reportStatus.textContent = error.message || "Unable to download report.";
    } finally {
        button.textContent = originalText;
        setDownloadState();
    }
}

periodButtons.forEach((button) => {
    button.addEventListener("click", () => {
        if (isLoading) return;
        selectedPeriod = button.dataset.period;
        renderReport();
    });
});

reportDateInput.value = toDateInputValue(new Date());
reportDateInput.addEventListener("change", () => {
    if (!isLoading) renderReport();
});

downloadButton.addEventListener("click", () => {
    downloadReportFile("csv", downloadButton);
});

pdfButton.addEventListener("click", () => {
    downloadReportFile("pdf", pdfButton);
});

loadExpenses();
