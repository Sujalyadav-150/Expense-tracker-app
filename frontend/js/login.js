const form = document.getElementById("loginForm");

window.addEventListener("DOMContentLoaded", () => {
  if (form) form.reset();
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  if (emailInput) emailInput.value = "";
  if (passwordInput) passwordInput.value = "";

  const urlParams = new URLSearchParams(window.location.search);
  const message = document.getElementById("message");
  if (urlParams.get("registered") === "true" && message) {
    message.style.color = "#1f6b4a";
    message.textContent = "Account created successfully. Please login.";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitBtn = form.querySelector("button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";
  }

  const user = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value
  };

  const message = document.getElementById("message");

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Login failed.");
    }

    if (result.token) {
      localStorage.setItem("authToken", result.token);
    }
    localStorage.setItem("loggedInUser", JSON.stringify(result.user));
    window.location.href = "expenses.html";
  } catch (error) {
    message.textContent = error.message;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Login";
    }
  }
});
