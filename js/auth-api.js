/* =================================================================== */
/*             BIOMED SOLUTIONS - AUTHENTICATION SCRIPT (API)          */
/* This single script handles the complete front-end logic for the     */
/* Login, Signup, Forgot Password, and Reset Password pages.           */
/* =================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // --- 1. CONFIGURATION & GLOBAL SETUP ---
  const API_BASE_URL = "http://localhost:3000/api/auth";

  // ===================================================================
  //                         2. SHARED UI COMPONENTS
  // ===================================================================

  /**
   * Handles the smooth fade-out of the preloader and fade-in of the main content.
   */
  window.addEventListener("load", () => {
    const preloader = document.querySelector(".preloader");
    if (preloader) {
      preloader.classList.add("fade-out");
      preloader.addEventListener(
        "transitionend",
        () => (preloader.style.display = "none")
      );
    }
    document.querySelector(".auth-container")?.classList.add("loaded");
  });

  /**
   * Creates and displays a sleek, non-intrusive toast notification.
   * @param {string} message - The message to display.
   * @param {'success' | 'danger'} type - The type of toast (for styling).
   */
  const toastContainer = document.getElementById("toast-container");
  function showToast(message, type = "success") {
    if (!toastContainer) return;
    const toastId = "toast-" + Date.now();
    const toastColorClass =
      type === "success" ? "border-success" : "border-danger";
    const toastIcon =
      type === "success"
        ? '<i class="bi bi-check-circle-fill text-success me-2"></i>'
        : '<i class="bi bi-exclamation-triangle-fill text-danger me-2"></i>';

    const toastHTML = `
            <div id="${toastId}" class="toast ${toastColorClass}" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header"><strong class="me-auto">${toastIcon} ${
      type.charAt(0).toUpperCase() + type.slice(1)
    }</strong><button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button></div>
                <div class="toast-body">${message}</div>
            </div>`;
    toastContainer.insertAdjacentHTML("beforeend", toastHTML);
    const toastElement = document.getElementById(toastId);
    new bootstrap.Toast(toastElement, { delay: 5000 }).show();
    toastElement.addEventListener("hidden.bs.toast", () =>
      toastElement.remove()
    );
  }

  /**
   * Toggles the loading state of a button.
   * @param {HTMLElement} button - The button element.
   * @param {boolean} isLoading - True to show spinner, false to show text.
   * @param {string} defaultText - The text to display when not loading.
   */
  function setButtonLoading(button, isLoading, defaultText = "Submit") {
    if (!button) return;
    const textSpan = button.querySelector(".btn-text");
    button.disabled = isLoading;
    button.classList.toggle("loading", isLoading);
    if (textSpan && defaultText)
      textSpan.textContent = isLoading ? "Processing..." : defaultText;
  }

  // ===================================================================
  //                         3. PAGE-SPECIFIC LOGIC
  // ===================================================================

  // --- SIGNUP PAGE ---
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const emailInput = document.getElementById("email");
    const lengthCheck = document.getElementById("length-check");
    const upperCheck = document.getElementById("upper-check");
    const numberCheck = document.getElementById("number-check");

    const validatePassword = () => {
      const pass = passwordInput.value;
      const checks = {
        length: pass.length >= 8,
        upper: /[A-Z]/.test(pass),
        number: /[0-9]/.test(pass),
      };
      lengthCheck.classList.toggle("valid", checks.length);
      upperCheck.classList.toggle("valid", checks.upper);
      numberCheck.classList.toggle("valid", checks.number);
      return checks.length && checks.upper && checks.number;
    };

    passwordInput.addEventListener("input", validatePassword);

    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const signupButton = document.getElementById("signup-button");
      const formData = {
        fullName: signupForm.querySelector("#fullName").value,
        email: emailInput.value,
        password: passwordInput.value,
      };

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        return showToast("Please enter a valid email address.", "danger");
      if (!validatePassword())
        return showToast("Password does not meet all criteria.", "danger");
      if (formData.password !== confirmPasswordInput.value)
        return showToast("Passwords do not match.", "danger");

      setButtonLoading(signupButton, true, "Create Account");

      try {
        const response = await fetch(`${API_BASE_URL}/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "An unknown error occurred.");

        showToast(
          "Account created successfully! Redirecting to login...",
          "success"
        );
        setTimeout(() => (window.location.href = "login.html"), 2000);
      } catch (error) {
        showToast(error.message, "danger");
        setButtonLoading(signupButton, false, "Create Account");
      }
    });
  }

  // --- LOGIN PAGE ---
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const loginButton = document.getElementById("login-button");
      const authOverlay = document.getElementById("auth-overlay");
      const formData = {
        email: loginForm.querySelector("#email").value,
        password: loginForm.querySelector("#password").value,
      };

      if (authOverlay) authOverlay.classList.add("show");
      setButtonLoading(loginButton, true, "Authorize");

      try {
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Login failed.");

        localStorage.setItem("adminToken", result.token);
        localStorage.setItem("adminName", result.userName);
        localStorage.setItem("adminAvatar", result.avatarUrl);

        setTimeout(() => (window.location.href = "admin-dashboard.html"), 1000);
      } catch (error) {
        if (authOverlay) authOverlay.classList.remove("show");
        showToast(error.message, "danger");
        setButtonLoading(loginButton, false, "Authorize");
      }
    });
  }

  // --- FORGOT PASSWORD PAGE ---
  const forgotPasswordForm = document.getElementById("forgot-password-form");
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const resetButton = document.getElementById("reset-button");
      const email = forgotPasswordForm.querySelector("#email").value;

      if (!email) {
        return showToast("Please enter your email address.", "danger");
      }

      setButtonLoading(resetButton, true, "Sending Link...");

      try {
        const response = await fetch(`${API_BASE_URL}/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const result = await response.json();

        if (!response.ok) {
          // This will catch the "Failed to send" error from the server.
          throw new Error(result.message);
        }

        // On success, ALWAYS show the generic message from the server.
        showToast(result.message, "success");
      } catch (error) {
        // This catches network errors or the thrown server error.
        showToast(error.message, "danger");
      } finally {
        // This GUARANTEES the button is always re-enabled, preventing it from getting stuck.
        setButtonLoading(resetButton, false, "Send Recovery Link");
      }
    });
  }

  // --- RESET PASSWORD PAGE ---
  const resetPasswordForm = document.getElementById("reset-password-form");
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const updateButton = document.getElementById("update-password-button");
      const password = resetPasswordForm.querySelector("#password").value;
      const confirmPassword =
        resetPasswordForm.querySelector("#confirmPassword").value;
      const token = new URLSearchParams(window.location.search).get("token");

      if (!token) return showToast("Invalid or missing reset token.", "danger");
      if (password.length < 8)
        return showToast("Password must be at least 8 characters.", "danger");
      if (password !== confirmPassword)
        return showToast("Passwords do not match.", "danger");

      setButtonLoading(updateButton, true, "Updating Password...");

      try {
        const response = await fetch(`${API_BASE_URL}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        showToast(result.message, "success");
        setTimeout(() => (window.location.href = "login.html"), 2000);
      } catch (error) {
        showToast(error.message, "danger");
        setButtonLoading(updateButton, false, "Update Password");
      }
    });
  }

  // --- GLOBAL PASSWORD TOGGLE LOGIC ---
  document.querySelectorAll(".password-toggle-icon").forEach((icon) => {
    icon.addEventListener("click", () => {
      const inputWrapper = icon.closest(".input-icon-wrapper");
      const input = inputWrapper.querySelector("input");
      if (input) {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        icon.classList.toggle("bi-eye-slash-fill", !isPassword);
        icon.classList.toggle("bi-eye-fill", isPassword);
      }
    });
  });
});
