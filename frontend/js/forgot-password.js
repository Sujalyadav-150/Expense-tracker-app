const form = document.getElementById("forgotPasswordForm");
const message = document.getElementById("message");
const genericMessage = "If this account exists, a password reset email has been sent.";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  message.textContent = "Sending reset link...";

  try {
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
  } catch (error) {
    // Keep the response identical even when the request cannot be completed.
  }

  message.textContent = genericMessage;
});
