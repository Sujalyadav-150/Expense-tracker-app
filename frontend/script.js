const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
const form = document.getElementById("form");
const msg = document.getElementById("msg");
const leaderboardBtn = document.getElementById("leaderboardBtn");
const leaderboardCard = document.getElementById("leaderboardCard");
const premiumRow = document.getElementById("premiumRow");
const premiumRequired = document.getElementById("premiumRequired");
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
const leaderboardTotal = document.getElementById("leaderboardTotal");
const leaderboard = document.getElementById("leaderboard");
const amount = document.getElementById("amount");
const description = document.getElementById("description");
const category = document.getElementById("category");

const esc = x => { const d = document.createElement("div"); d.textContent = x; return d.innerHTML; };

async function request(path, options = {}) {
  const url = API + (path.startsWith("/api/") ? path.slice(4) : path);
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error("Unable to reach the backend. Check the deployed API URL and CORS settings.");
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
  authScreen.hidden = isLogged;
  trackerApp.hidden = !isLogged;
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "register";
  authTitle.textContent = signup ? "Create your account" : "Welcome back";
  authSubtitle.textContent = signup ? "Start tracking your expenses" : "Sign in to continue to your expenses";
  authSubmit.textContent = signup ? "Create account" : "Login";
  registerBtn.textContent = signup ? "Back to login" : "Create a new account";
  authMsg.textContent = "";
}

logoutBtn.addEventListener("click", () => {
  clearAuth();
  authMsg.textContent = "You have been logged out.";
});

if (leaderboardBtn) {
  leaderboardBtn.addEventListener("click", async () => {
    const isHidden = leaderboardCard.hidden;
    if (isHidden) {
      leaderboardBtn.disabled = true;
      leaderboardBtn.textContent = "Loading...";
      await loadLeaderboard();
      leaderboardBtn.disabled = false;
      leaderboardCard.hidden = false;
      leaderboardBtn.textContent = "Hide Leaderboard";
      leaderboardCard.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      leaderboardCard.hidden = true;
      leaderboardBtn.textContent = "Show Leaderboard";
    }
  });
}

async function load() {
  if (!currentUser) return;
  try {
    const queryEmail = currentUser.email ? `?email=${encodeURIComponent(currentUser.email)}` : "";
    const xs = await request(`/api/expenses${queryEmail}`, { headers: authHeaders() });
    let t = 0;
    list.innerHTML = "";
    const items = Array.isArray(xs) ? xs : [];
    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state">No expenses added yet.</div>';
    } else {
      items.forEach(x => {
        t += +x.amount;
        const d = document.createElement("div");
        d.className = "expense";
        d.innerHTML = `<div><b>${esc(x.description)}</b><div class="meta"><span class="cat">${esc(x.category)}</span>${x.aiSuggested ? '<span class="ai"> • AI suggested</span>' : ""} • ${new Date(x.createdAt || Date.now()).toLocaleDateString()}</div></div><div><b>₹${(+x.amount).toFixed(2)}</b> <button class="del" onclick="del('${x.id}')">Delete</button></div>`;
        list.appendChild(d);
      });
    }
    total.textContent = `Total: ₹${t.toFixed(2)}`;
  } catch (error) {
    list.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`;
  }
}

async function loadLeaderboard() {
  try {
    const data = await request("/api/leaderboard?limit=10", { headers: authHeaders() });
    const listData = data.leaderboard || [];
    leaderboardTotal.textContent = `${listData.length} users`;
    if (!listData.length) {
      leaderboard.innerHTML = '<div class="empty-state">No user expenses yet.</div>';
      return;
    }
    const max = listData[0].totalExpense || 1;
    leaderboard.innerHTML = `<div class="rank-list">${listData.map(row => `<div class="rank-row"><span class="rank-number">#${row.rank}</span><span class="rank-category">${esc(row.name || row.email)}</span><span class="rank-track"><i style="width:${Math.max(8, (row.totalExpense / max) * 100)}%"></i></span><b>₹${row.totalExpense.toFixed(2)}</b></div>`).join("")}</div>`;
  } catch (e) {
    leaderboard.innerHTML = `<div class="empty-state">${esc(e.message)}</div>`;
  }
}

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
  registerBtn.disabled = true;
  authMsg.textContent = authMode === "register" ? "Creating your account..." : "Logging in...";
  try {
    const path = authMode === "register" ? "/api/auth/signup" : "/api/auth/login";
    const data = await request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: email.split("@")[0] })
    });

    // Auto-login immediately upon successful account creation or login
    setAuth(data);
    authMsg.textContent = authMode === "register" ? "Account created and logged in!" : "Login successful";
    authForm.reset();
  } catch (error) {
    authMsg.textContent = error.message;
  } finally {
    authSubmit.disabled = false;
    registerBtn.disabled = false;
  }
};

registerBtn.onclick = () => {
  setAuthMode(authMode === "register" ? "login" : "register");
  if (authMode === "register") authEmail.focus();
};

form.onsubmit = async e => {
  e.preventDefault();
  msg.textContent = "Categorizing...";
  const body = {
    amount: +amount.value,
    description: description.value.trim(),
    email: currentUser?.email
  };
  if (category.value) body.category = category.value;
  try {
    const x = await request("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body)
    });
    msg.textContent = x.category ? `Category: ${x.category}` : "Expense added.";
    form.reset();
    load();
  } catch (error) {
    msg.textContent = error.message;
  }
};

async function del(id) {
  if (confirm("Delete this expense?")) {
    try {
      const queryEmail = currentUser?.email ? `?email=${encodeURIComponent(currentUser.email)}` : "";
      await request("/api/expenses/" + id + queryEmail, { method: "DELETE", headers: authHeaders() });
      load();
    } catch (error) {
      msg.textContent = error.message;
    }
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

updatePremiumState();
if (currentUser) load();
