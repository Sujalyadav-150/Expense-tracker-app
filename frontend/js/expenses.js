const form = document.getElementById("expenseForm");
const tableBody = document.getElementById("expenseTableBody");
const descriptionInput = document.getElementById("description");
const aiSuggestion = document.getElementById("aiSuggestion");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const paginationSummary = document.getElementById("paginationSummary");
const pageNavigation = document.getElementById("pageNavigation");
const pageNumbers = document.getElementById("pageNumbers");
const pageIndicator = document.getElementById("pageIndicator");
const previousPageBtn = document.getElementById("previousPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const expenseListStatus = document.getElementById("expenseListStatus");

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser") || localStorage.getItem("expenseTrackerUser") || "null");
const authToken = localStorage.getItem("authToken") || localStorage.getItem("expenseTrackerToken");
const pageSizeOptions = [5, 10, 20, 30, 40];
const savedPageSize = Number(localStorage.getItem("expensesPerPage") || localStorage.getItem("expensePageSize"));
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
let pagination = { currentPage: 1, pageSize, totalExpenses: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false };
let isLoadingExpenses = false;
let paginationReady = false;
let expenseRequestSequence = 0;

if (!loggedInUser) {
  window.location.href = "login.html";
}

function authHeaders() {
  const headers = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  return headers;
}

function updateTotalExpense(amount) {
  const totalElement = document.getElementById("totalExpenseAmount");
  if (!totalElement) return;
  const sum = Number(amount) || 0;
  const formatted = sum % 1 === 0 
    ? sum.toLocaleString("en-IN")
    : sum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  totalElement.textContent = `₹${formatted}`;
}

function renderExpenses(expenses) {
  if (!expenses.length) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">No expenses found.</td></tr>';
  } else {
    tableBody.innerHTML = expenses.map((expense) => `
      <tr>
        <td>₹${Number(expense.amount).toFixed(2)}</td>
        <td>${expense.description}</td>
        <td>${expense.category}</td>
        <td>${expense.categorySource || "saved"}</td>
        <td><button class="delete-button" data-expense-id="${expense.id}" type="button">Delete</button></td>
      </tr>
    `).join("");
  }
}

function renderPagination() {
  const { currentPage: page, pageSize: size, totalExpenses, totalPages } = pagination;
  const start = totalExpenses ? (page - 1) * size + 1 : 0;
  paginationSummary.textContent = totalExpenses
    ? `Showing ${start}-${Math.min(start + size - 1, totalExpenses)} of ${totalExpenses} expenses`
    : "Showing 0 expenses";
  pageIndicator.textContent = `Page ${page} of ${totalPages}`;
  const firstPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const lastPage = Math.min(totalPages, firstPage + 4);
  const visiblePages = [];
  if (firstPage > 1) visiblePages.push(1, ...(firstPage > 2 ? [null] : []));
  for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) visiblePages.push(pageNumber);
  if (lastPage < totalPages) visiblePages.push(...(lastPage < totalPages - 1 ? [null] : []), totalPages);
  pageNumbers.innerHTML = visiblePages.map((pageNumber) => pageNumber === null
    ? '<span class="page-ellipsis" aria-hidden="true">...</span>'
    : `<button type="button" data-page="${pageNumber}" aria-label="Page ${pageNumber}"${pageNumber === page ? ' aria-current="page"' : ""}${isLoadingExpenses ? " disabled" : ""}>${pageNumber}</button>`
  ).join("");
  pageNavigation.hidden = !paginationReady || totalPages <= 1;
  pageSizeSelect.disabled = isLoadingExpenses;
  previousPageBtn.disabled = isLoadingExpenses || !pagination.hasPreviousPage;
  nextPageBtn.disabled = isLoadingExpenses || !pagination.hasNextPage;
}

pageSizeSelect.value = String(pageSize);
pageSizeSelect.addEventListener("change", () => {
  const selectedPageSize = Number(pageSizeSelect.value);
  if (isLoadingExpenses || !pageSizeOptions.includes(selectedPageSize)) return;
  pageSize = selectedPageSize;
  localStorage.setItem("expensesPerPage", String(pageSize));
  currentPage = 1;
  loadExpenses({ page: 1 });
});

previousPageBtn.addEventListener("click", () => {
  if (!isLoadingExpenses && pagination.hasPreviousPage) {
    loadExpenses({ page: currentPage - 1 });
  }
});

nextPageBtn.addEventListener("click", () => {
  if (!isLoadingExpenses && pagination.hasNextPage) {
    loadExpenses({ page: currentPage + 1 });
  }
});

pageNumbers.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-page]");
  const selectedPage = Number(pageButton?.dataset.page);
  if (!isLoadingExpenses && Number.isInteger(selectedPage) && selectedPage >= 1 && selectedPage <= pagination.totalPages) {
    loadExpenses({ page: selectedPage });
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

    await loadExpenses({ page: currentPage });
  } catch (error) {
    if (button) button.disabled = false;
    window.alert(error.message);
  }
}

async function loadExpenses({ page = currentPage } = {}) {
  if (!loggedInUser?.email) return;
  const requestSequence = ++expenseRequestSequence;
  isLoadingExpenses = true;
  expenseListStatus.textContent = "Loading expenses...";
  renderPagination();

  try {
    const result = await apiJson(`/api/expenses?page=${page}&limit=${pageSize}`, {
      headers: authHeaders()
    });
    if (requestSequence !== expenseRequestSequence) return;
    if (!Array.isArray(result.expenses) || !result.pagination) {
      throw new Error("The expenses response was invalid.");
    }

    currentExpenses = result.expenses;
    pagination = result.pagination;
    currentPage = pagination.currentPage;
    pageSize = pagination.pageSize;
    pageSizeSelect.value = String(pageSize);
    paginationReady = true;
    renderExpenses(currentExpenses);
    updateTotalExpense(result.totalAmount);
    expenseListStatus.textContent = "";
  } catch (error) {
    if (requestSequence !== expenseRequestSequence) return;
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9a352d;">Unable to load expenses. Please try again. <button class="pagination-retry" data-retry-expenses type="button">Retry</button></td></tr>';
    expenseListStatus.textContent = error.message;
    pageNavigation.hidden = true;
  } finally {
    if (requestSequence === expenseRequestSequence) {
      isLoadingExpenses = false;
      renderPagination();
    }
  }
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
    if (result && result.id) await loadExpenses({ page: 1 });
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
  if (event.target.closest("[data-retry-expenses]")) {
    loadExpenses().catch((error) => window.alert(error.message));
    return;
  }
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

renderPagination();
loadExpenses();

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    clearStoredAuth();
    window.location.href = "login.html";
  });
}
