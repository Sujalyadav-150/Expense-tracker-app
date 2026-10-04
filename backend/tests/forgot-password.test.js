const assert = require("node:assert/strict");
const { once } = require("node:events");
const app = require("../app");
const db = require("../utils/db");
const mailService = require("../services/mailService");

const GENERIC_FORGOT_MESSAGE = "If this account exists, a password reset email has been sent.";
const sentResetEmails = [];
const originalSendPasswordResetEmail = mailService.sendPasswordResetEmail;
mailService.sendPasswordResetEmail = async (email) => {
  sentResetEmails.push(email);
  return { delivered: true };
};

(async () => {
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  async function post(path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  function latestResetToken() {
    const latestEmail = sentResetEmails[sentResetEmails.length - 1];
    return new URL(latestEmail.resetUrl).searchParams.get("token");
  }

  try {
    const testUser = {
      name: "Test Runner",
      email: `test-user-${Date.now()}@example.com`,
      password: "initialPassword123"
    };

    console.log("--- TEST 1: New user -> Forgot Password -> Reset Password -> Login ---");
    const signupRes = await post("/api/auth/signup", testUser);
    assert.equal(signupRes.status, 201, "User signup should succeed");

    const unknownEmail = await post("/api/auth/forgot-password", { email: `unknown-${Date.now()}@example.com` });
    assert.equal(unknownEmail.status, 200);
    assert.equal(unknownEmail.data.message, GENERIC_FORGOT_MESSAGE);
    assert.equal(sentResetEmails.length, 0, "Unknown accounts must not receive email");

    const forgot1 = await post("/api/auth/forgot-password", { email: testUser.email });
    assert.equal(forgot1.status, 200, "Forgot password #1 should return 200");
    assert.equal(forgot1.data.message, GENERIC_FORGOT_MESSAGE);
    assert.equal(Object.hasOwn(forgot1.data, "resetToken"), false);
    assert.equal(Object.hasOwn(forgot1.data, "resetUrl"), false);
    const token1 = latestResetToken();
    assert.ok(token1, "The reset token should be sent through email");

    const reset1 = await post("/api/auth/reset-password", {
      token: token1,
      password: "newPasswordCase1"
    });
    assert.equal(reset1.status, 200, "Reset password should succeed");
    assert.equal(reset1.data.message, "Password reset successfully.");

    const login1 = await post("/api/auth/login", {
      name: testUser.name,
      email: testUser.email,
      password: "newPasswordCase1"
    });
    assert.equal(login1.status, 200, "Login with new password should succeed");
    console.log("TEST 1 PASSED");

    console.log("--- TEST 2: Same user -> Forgot Password again -> Reset -> Login ---");
    const forgot2 = await post("/api/auth/forgot-password", { email: testUser.email });
    assert.equal(forgot2.status, 200, "Forgot password #2 should return 200");
    assert.equal(forgot2.data.message, GENERIC_FORGOT_MESSAGE);
    const token2 = latestResetToken();
    assert.notEqual(token2, token1, "New request must generate a new token");

    const reset2 = await post("/api/auth/reset-password", {
      token: token2,
      password: "newPasswordCase2"
    });
    assert.equal(reset2.status, 200, "Reset password #2 should succeed");

    const login2 = await post("/api/auth/login", {
      name: testUser.name,
      email: testUser.email,
      password: "newPasswordCase2"
    });
    assert.equal(login2.status, 200, "Login with password #2 should succeed");
    console.log("TEST 2 PASSED");

    console.log("--- TEST 3: Multiple Forgot Password requests in succession (5 times) ---");
    const tokens = [];
    for (let i = 1; i <= 5; i++) {
      const res = await post("/api/auth/forgot-password", { email: testUser.email });
      assert.equal(res.status, 200, `Forgot password request ${i} should return 200`);
      assert.equal(res.data.message, GENERIC_FORGOT_MESSAGE);
      assert.equal(Object.hasOwn(res.data, "resetToken"), false);
      assert.equal(Object.hasOwn(res.data, "resetUrl"), false);
      tokens.push(latestResetToken());
    }
    const uniqueTokens = new Set(tokens);
    assert.equal(uniqueTokens.size, 5, "All 5 tokens must be unique");

    // Use the 5th token to update the password
    const reset3 = await post("/api/auth/reset-password", {
      token: tokens[4],
      password: "newPasswordCase3"
    });
    assert.equal(reset3.status, 200, "Reset with 5th token should succeed");

    const login3 = await post("/api/auth/login", {
      name: testUser.name,
      email: testUser.email,
      password: "newPasswordCase3"
    });
    assert.equal(login3.status, 200, "Login after 5th token reset should succeed");
    console.log("TEST 3 PASSED");

    console.log("--- TEST 4: Expired token rejected ---");
    const expiredRawToken = "expired-token-" + Date.now();
    await db.createResetToken({ email: testUser.email, rawToken: expiredRawToken, expiresInMs: -60000 }); // expired 1 min ago

    const expiredRes = await post("/api/auth/reset-password", {
      token: expiredRawToken,
      password: "shouldNotWorkPass"
    });
    assert.equal(expiredRes.status, 400, "Expired token must be rejected with 400");
    assert.equal(expiredRes.data.message, "Invalid or expired reset token.");
    console.log("TEST 4 PASSED");

    console.log("--- TEST 5: Random invalid token rejected ---");
    const randomRes = await post("/api/auth/reset-password", {
      token: "completely-random-invalid-token-abc-123",
      password: "shouldNotWorkPass"
    });
    assert.equal(randomRes.status, 400, "Random token must be rejected with 400");
    assert.equal(randomRes.data.message, "Invalid or expired reset token.");
    console.log("TEST 5 PASSED");

    console.log("--- TEST 6: Already-used token rejected ---");
    const reuseRes = await post("/api/auth/reset-password", {
      token: tokens[4],
      password: "attemptReusingUsedToken"
    });
    assert.equal(reuseRes.status, 400, "Reusing a token must be rejected with 400");
    assert.equal(reuseRes.data.message, "Invalid or expired reset token.");
    console.log("TEST 6 PASSED");

    console.log("--- TEST 7: New password works ---");
    const validLogin = await post("/api/auth/login", {
      name: testUser.name,
      email: testUser.email,
      password: "newPasswordCase3"
    });
    assert.equal(validLogin.status, 200, "Login with new password should succeed");
    console.log("TEST 7 PASSED");

    console.log("--- TEST 8: Old passwords no longer work ---");
    const oldLogin1 = await post("/api/auth/login", {
      name: testUser.name,
      email: testUser.email,
      password: "initialPassword123"
    });
    assert.equal(oldLogin1.status, 401, "Login with original old password should fail");

    const oldLogin2 = await post("/api/auth/login", {
      name: testUser.name,
      email: testUser.email,
      password: "newPasswordCase2"
    });
    assert.equal(oldLogin2.status, 401, "Login with intermediate old password should fail");
    console.log("TEST 8 PASSED");

    console.log("\nAll automated test cases passed successfully!");
  } finally {
    server.close();
    mailService.sendPasswordResetEmail = originalSendPasswordResetEmail;
  }
})();
