const API = "/api";
const form = document.getElementById("form");
const msg = document.getElementById("msg");
const authScreen = document.getElementById("authScreen");
const trackerApp = document.getElementById("trackerApp");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMsg = document.getElementById("authMsg");
const authSubmit = document.getElementById("authSubmit");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const list = document.getElementById("list");
const total = document.getElementById("total");
const insight = document.getElementById("insight");
const insightBtn = document.getElementById("insightBtn");
const amount = document.getElementById("amount");
const description = document.getElementById("description");
const category = document.getElementById("category");
const leaderboardRefresh = document.getElementById("leaderboardRefresh");
const leaderboardStatus = document.getElementById("leaderboardStatus");
const leaderboardSummary = document.getElementById("leaderboardSummary");
const leaderboardTableWrap = document.getElementById("leaderboardTableWrap");
const leaderboardBody = document.getElementById("leaderboardBody");
const myRank = document.getElementById("myRank");
const myTotalExpense = document.getElementById("myTotalExpense");
const myExpenseCount = document.getElementById("myExpenseCount");

const esc = x => { const d = document.createElement("div"); d.textContent = x; return d.innerHTML; };

async function request(path, options = {}) {
  const url = API + (path.startsWith("/api/") ? path.slice(4) : path);
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error("Unable to reach the backend. Check network connectivity.");
  }
  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`Backend returned an invalid response (${response.status}).`);
  }
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status}).`);
  return data;
}

let authToken = localStorage.getItem("authToken") || localStorage.getItem("expenseTrackerToken");
let currentUser = JSON.parse(localStorage.getItem("loggedInUser") || localStorage.getItem("expenseTrackerUser") || "null");
let authMode = "login";

function authHeaders() {
  const headers = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  return headers;
}

function setAuth(data) {
  authToken = data.token;
  currentUser = data.user;
  localStorage.setItem("authToken", authToken);
  localStorage.setItem("expenseTrackerToken", authToken);
  localStorage.setItem("loggedInUser", JSON.stringify(currentUser));
  localStorage.setItem("expenseTrackerUser", JSON.stringify(currentUser));
  updatePremiumState();
  load();
}

function clearAuth() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("expenseTrackerToken");
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("expenseTrackerUser");
  updatePremiumState();
}

function updatePremiumState() {
  const isLogged = Boolean(currentUser);
  if (authScreen) authScreen.hidden = isLogged;
  if (trackerApp) trackerApp.hidden = !isLogged;
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function renderLeaderboard(rows) {
  const visibleRows = (Array.isArray(rows) ? rows : []).filter((row) => {
    const name = String(row?.name || "").trim().toLowerCase();
    return !name.startsWith("prem");
  });

  if (!visibleRows.length) {
    leaderboardTableWrap.hidden = true;
    leaderboardSummary.hidden = true;
    leaderboardStatus.textContent = "No users found.";
    return;
  }

  leaderboardBody.innerHTML = visibleRows.map((row) => {
    const isCurrentUser = Boolean(row.isCurrentUser);
    return `<tr class="${isCurrentUser ? "current-user" : ""}">
      <td data-label="Rank">#${row.rank}</td>
      <td data-label="User"><strong>${esc(row.name)}</strong>${isCurrentUser ? " <span class=\"you-badge\">You</span>" : ""}</td>
      <td data-label="Total Expense">${formatCurrency(row.totalExpense)}</td>
      <td data-label="Expenses">${row.expenseCount}</td>
    </tr>`;
  }).join("");

  const mine = visibleRows.find((row) => row.isCurrentUser);
  if (mine) {
    myRank.textContent = `#${mine.rank}`;
    myTotalExpense.textContent = formatCurrency(mine.totalExpense);
    myExpenseCount.textContent = String(mine.expenseCount);
    leaderboardSummary.hidden = false;
  }
  leaderboardTableWrap.hidden = false;
  leaderboardStatus.textContent = "Leaderboard updated.";
}

async function loadLeaderboard() {
  if (!currentUser || !leaderboardStatus) return;
  leaderboardRefresh.disabled = true;
  leaderboardStatus.textContent = "Loading leaderboard...";
  try {
    const data = await request("/api/leaderboard", { headers: authHeaders() });
    renderLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
  } catch (error) {
    leaderboardTableWrap.hidden = true;
    leaderboardSummary.hidden = true;
    leaderboardStatus.textContent = "Unable to load leaderboard. Please try again.";
  } finally {
    leaderboardRefresh.disabled = false;
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "register";
  if (authTitle) authTitle.textContent = signup ? "Create your account" : "Welcome back";
  if (authSubtitle) authSubtitle.textContent = signup ? "Start tracking your expenses" : "Sign in to continue to your expenses";
  if (authSubmit) authSubmit.textContent = signup ? "Create account" : "Login";
  if (registerBtn) registerBtn.textContent = signup ? "Back to login" : "Create a new account";
  if (authMsg) authMsg.textContent = "";
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    clearAuth();
    if (authMsg) authMsg.textContent = "You have been logged out.";
  });
}

function renderExpenseItem(x) {
  const d = document.createElement("div");
  d.className = "expense";
  d.dataset.expenseId = String(x.id);
  d.dataset.amount = String(Number(x.amount) || 0);
  d.innerHTML = `<div><b>${esc(x.description)}</b><div class="meta"><span class="cat">${esc(x.category)}</span>${x.aiSuggested ? '<span class="ai"> • AI suggested</span>' : ""} • ${new Date(x.createdAt || Date.now()).toLocaleDateString()}</div></div><div><b>₹${(+x.amount).toFixed(2)}</b> <button class="del" onclick="del('${x.id}')">Delete</button></div>`;
  return d;
}

function updateTotalFromList() {
  if (!list || !total) return;
  const amounts = [...list.querySelectorAll(".expense")]
    .map(el => Number(el.dataset.amount) || 0);
  const sum = amounts.reduce((a, b) => a + b, 0);
  total.textContent = `Total: ₹${sum.toFixed(2)}`;
}

async function load() {
  if (!currentUser || !list) return;
  try {
    const xs = await request("/api/expenses", { headers: authHeaders() });
    const items = Array.isArray(xs) ? xs : [];
    list.innerHTML = "";
    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state">No expenses added yet.</div>';
    } else {
      items.forEach(x => list.appendChild(renderExpenseItem(x)));
    }
    updateTotalFromList();
  } catch (error) {
    list.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`;
    if (total) total.textContent = "Total: ₹0.00";
  }
}

if (authForm) {
  authForm.onsubmit = async e => {
    e.preventDefault();
    const email = authEmail.value.trim().toLowerCase();
    const password = authPassword.value;
    if (!email) {
      authMsg.textContent = "Please enter your email address.";
      authEmail.focus();
      return;
    }
    if (password.length < 6) {
      authMsg.textContent = "Password must be at least 6 characters.";
      authPassword.focus();
      return;
    }
    authSubmit.disabled = true;
    if (registerBtn) registerBtn.disabled = true;
    authMsg.textContent = authMode === "register" ? "Creating your account..." : "Logging in...";
    try {
      const path = authMode === "register" ? "/api/auth/signup" : "/api/auth/login";
      const data = await request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: email.split("@")[0] })
      });

      if (authMode === "register") {
        authForm.reset();
        setAuthMode("login");
        authMsg.textContent = "Account created successfully. Please login.";
        authEmail.focus();
        return;
      }

      setAuth(data);
      authMsg.textContent = "Login successful";
      authForm.reset();
    } catch (error) {
      authMsg.textContent = error.message;
    } finally {
      authSubmit.disabled = false;
      if (registerBtn) registerBtn.disabled = false;
    }
  };
}

if (registerBtn) {
  registerBtn.onclick = () => {
    setAuthMode(authMode === "register" ? "login" : "register");
    if (authMode === "register" && authEmail) authEmail.focus();
  };
}

if (form) {
  form.onsubmit = async e => {
    e.preventDefault();
    const numericAmount = Number(amount.value);
    const textDescription = description.value.trim();
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !textDescription) {
      msg.textContent = "Enter a valid amount and description.";
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    msg.textContent = "Adding expense...";

    const body = {
      amount: numericAmount,
      description: textDescription
    };
    if (category && category.value) body.category = category.value;

    try {
      // The API response already contains the saved expense, so don't make
      // a second GET request. This makes the UI update immediately after save.
      const x = await request("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body)
      });

      if (list) {
        const empty = list.querySelector(".empty-state");
        if (empty) empty.remove();
        list.prepend(renderExpenseItem(x));
      }
      updateTotalFromList();
      msg.textContent = x.category ? `Category: ${x.category}` : "Expense added.";
      form.reset();
    } catch (error) {
      msg.textContent = error.message;
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  };
}

async function del(id) {
  if (!confirm("Delete this expense?")) return;

  const row = list?.querySelector(`.expense[data-expense-id="${CSS.escape(String(id))}"]`);
  if (row) row.style.opacity = "0.5";

  try {
    await request("/api/expenses/" + encodeURIComponent(id), {
      method: "DELETE",
      headers: authHeaders()
    });
    if (row) row.remove();
    if (list && !list.querySelector(".expense")) {
      list.innerHTML = '<div class="empty-state">No expenses added yet.</div>';
    }
    updateTotalFromList();
    if (msg) msg.textContent = "Expense deleted.";
  } catch (error) {
    if (row) row.style.opacity = "1";
    if (msg) msg.textContent = error.message;
  }
}
window.del = del;

if (insightBtn) {
  insightBtn.onclick = async () => {
    insight.innerHTML = '<div class="insight">AI is analyzing...</div>';
    try {
      const queryEmail = currentUser?.email ? `?email=${encodeURIComponent(currentUser.email)}` : "";
      const x = await request("/api/ai/insight" + queryEmail, { headers: authHeaders() });
      insight.innerHTML = `<div class="insight">✨ ${esc(x.insight || x.message)}</div>`;
    } catch (error) {
      insight.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`;
    }
  };
}

if (leaderboardRefresh) {
  leaderboardRefresh.addEventListener("click", () => loadLeaderboard());
}

const leaderboardCard = leaderboardRefresh?.closest(".leaderboard-card");
if (leaderboardCard && "IntersectionObserver" in window) {
  const leaderboardObserver = new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      loadLeaderboard();
      observer.disconnect();
    }
  }, { rootMargin: "160px" });
  leaderboardObserver.observe(leaderboardCard);
}

async function refreshSession() {
  if (!authToken) return;
  try {
    const data = await request("/api/auth/me", { headers: authHeaders() });
    if (data.user) {
      currentUser = data.user;
      localStorage.setItem("loggedInUser", JSON.stringify(currentUser));
      localStorage.setItem("expenseTrackerUser", JSON.stringify(currentUser));
    }
  } catch (error) {
    clearAuth();
  }
}

updatePremiumState();
if (currentUser) {
  refreshSession().finally(() => {
    updatePremiumState();
    load();
  });
}
