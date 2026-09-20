const form = document.getElementById("signupForm");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value
  };

  const message = document.getElementById("message");

  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Signup failed.");
    }

    if (result.token) {
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("expenseTrackerToken", result.token);
    }
    const userObj = result.user || { email: user.email, name: user.name || user.email.split("@")[0] };
    localStorage.setItem("loggedInUser", JSON.stringify(userObj));
    localStorage.setItem("expenseTrackerUser", JSON.stringify(userObj));

    window.location.href = "expenses.html";
  } catch (error) {
    message.textContent = error.message;
  }
});
