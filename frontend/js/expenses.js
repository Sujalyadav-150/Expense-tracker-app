const form = document.getElementById("expenseForm");
const tableBody = document.getElementById("expenseTableBody");
const descriptionInput = document.getElementById("description");
const aiSuggestion = document.getElementById("aiSuggestion");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const paginationSummary = document.getElementById("paginationSummary");
const pageIndicator = document.getElementById("pageIndicator");
const previousPageBtn = document.getElementById("previousPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser") || localStorage.getItem("expenseTrackerUser") || "null");
const authToken = localStorage.getItem("authToken") || localStorage.getItem("expenseTrackerToken");
const pageSizeOptions = [5, 8, 10, 20, 40];
const pageSizeStorageKey = `expensePageSize:${String(loggedInUser?.email || "guest").trim().toLowerCase()}`;
const savedPageSize = Number(localStorage.getItem(pageSizeStorageKey));
let pageSize = pageSizeOptions.includes(savedPageSize) ? savedPageSize : 10;

function clearStoredAuth() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("expenseTrackerToken");
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("expenseTrackerUser");
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  let result = {};
  try { result = await response.json(); } catch {}
  if (response.status === 401) {
    clearStoredAuth();
    window.location.href = "login.html";
    throw new Error("Your session expired. Please login again.");
  }
  if (!response.ok) throw new Error(result.message || "Request failed.");
  return result;
}

let currentExpenses = [];
let predictedCategory = null;
let predictedDescription = "";
let predictedSource = "fallback";
let currentPage = 1;

if (!loggedInUser) {
  window.location.href = "login.html";
}

function authHeaders() {
  const headers = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  return headers;
}

function updateTotalExpense(expenses) {
  const totalElement = document.getElementById("totalExpenseAmount");
  if (!totalElement) return;
  if (!Array.isArray(expenses) || expenses.length === 0) {
    totalElement.textContent = "₹0";
    return;
  }
  const sum = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const formatted = sum % 1 === 0 
    ? sum.toLocaleString("en-IN")
    : sum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  totalElement.textContent = `₹${formatted}`;
}

function renderExpenses(expenses) {
  const allExpenses = Array.isArray(expenses) ? expenses : [];
  const totalPages = Math.max(1, Math.ceil(allExpenses.length / pageSize));
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleExpenses = allExpenses.slice(startIndex, startIndex + pageSize);

  if (allExpenses.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">No expenses recorded yet.</td></tr>';
  } else {
    tableBody.innerHTML = visibleExpenses.map((expense) => `
      <tr>
        <td>₹${Number(expense.amount).toFixed(2)}</td>
        <td>${expense.description}</td>
        <td>${expense.category}</td>
        <td>${expense.categorySource || "saved"}</td>
        <td><button class="delete-button" data-expense-id="${expense.id}" type="button">Delete</button></td>
      </tr>
    `).join("");
  }

  paginationSummary.textContent = allExpenses.length
    ? `Showing ${startIndex + 1}-${Math.min(startIndex + pageSize, allExpenses.length)} of ${allExpenses.length}`
    : "Showing 0 expenses";
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  previousPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;
}

pageSizeSelect.value = String(pageSize);
pageSizeSelect.addEventListener("change", () => {
  const selectedPageSize = Number(pageSizeSelect.value);
  if (!pageSizeOptions.includes(selectedPageSize)) return;
  pageSize = selectedPageSize;
  currentPage = 1;
  localStorage.setItem(pageSizeStorageKey, String(pageSize));
  renderExpenses(currentExpenses);
});

previousPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderExpenses(currentExpenses);
  }
});

nextPageBtn.addEventListener("click", () => {
  if (currentPage < Math.ceil(currentExpenses.length / pageSize)) {
    currentPage += 1;
    renderExpenses(currentExpenses);
  }
});

async function deleteExpense(expenseId) {
  if (!window.confirm("Delete this expense?")) return;

  const button = tableBody.querySelector(`[data-expense-id="${CSS.escape(String(expenseId))}"]`);
  if (button) button.disabled = true;

  try {
    await apiJson(`/api/expenses/${encodeURIComponent(expenseId)}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    currentExpenses = currentExpenses.filter(expense => String(expense.id) !== String(expenseId));
    renderExpenses(currentExpenses);
    updateTotalExpense(currentExpenses);
  } catch (error) {
    window.alert(error.message);
  }
}

async function loadExpenses() {
  if (!loggedInUser?.email) return;
  const result = await apiJson("/api/expenses", {
    headers: authHeaders()
  });
  const list = Array.isArray(result) ? result : [];
  currentExpenses = list;
  renderExpenses(currentExpenses);
  updateTotalExpense(currentExpenses);
}

async function suggestCategory() {
  const description = descriptionInput.value.trim();
  if (!description) {
    predictedCategory = null;
    predictedDescription = "";
    predictedSource = "fallback";
    aiSuggestion.textContent = "AI category will appear here.";
    return;
  }

  aiSuggestion.textContent = "AI is thinking...";
  const result = await apiJson("/api/categorize-expense", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ description })
  });

  predictedCategory = result.category;
  predictedDescription = description;
  predictedSource = result.source || "fallback";
  aiSuggestion.textContent = `Suggested category: ${result.category}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitBtn = form.querySelector("button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding...";
  }

  const expense = {
    email: loggedInUser.email,
    amount: document.getElementById("amount").value,
    description: descriptionInput.value,
    category: predictedDescription === descriptionInput.value.trim() ? predictedCategory : null,
    categorySource: predictedDescription === descriptionInput.value.trim() ? predictedSource : null
  };

  try {
    const result = await apiJson("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(expense)
    });

    form.reset();
    predictedCategory = null;
    predictedDescription = "";
    predictedSource = "fallback";
    aiSuggestion.textContent = "AI category will appear here.";
    // The API returns the newly-created expense, so update the UI immediately
    // instead of waiting for two extra network/database requests.
    if (result && result.id) {
      currentExpenses = [result, ...currentExpenses];
      currentPage = 1;
      renderExpenses(currentExpenses);
      updateTotalExpense(currentExpenses);
    }
  } catch (error) {
    window.alert(error.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add expense";
    }
  }
});

tableBody.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-expense-id]");
  if (!deleteButton) {
    return;
  }

  deleteExpense(deleteButton.dataset.expenseId).catch((error) => window.alert(error.message));
});

let suggestionTimer;
descriptionInput.addEventListener("input", () => {
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(() => {
    suggestCategory().catch((error) => {
      aiSuggestion.textContent = error.message;
    });
  }, 400);
});

loadExpenses().catch((error) => window.alert(error.message));

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    clearStoredAuth();
    window.location.href = "login.html";
  });
}
