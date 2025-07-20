/* =================================================================== */
/*                   BIOMED ADMIN DASHBOARD SCRIPT                     */
/* =================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // ===================================================================
  //                         0. INITIALIZATION & CONFIG
  // ===================================================================
  const API_BASE_URL = "http://localhost:3000/api";
  const SERVER_URL = "http://localhost:3000";
  const token = localStorage.getItem("adminToken");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // ===================================================================
  //                         1. PROFESSIONAL UI COMPONENTS
  // ===================================================================

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
    const toastHTML = `<div id="${toastId}" class="toast ${toastColorClass}" role="alert"><div class="toast-header">${toastIcon}<strong class="me-auto">${
      type.charAt(0).toUpperCase() + type.slice(1)
    }</strong><button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button></div><div class="toast-body">${message}</div></div>`;
    toastContainer.insertAdjacentHTML("beforeend", toastHTML);
    const toastElement = document.getElementById(toastId);
    new bootstrap.Toast(toastElement, { delay: 4000 }).show();
    toastElement.addEventListener("hidden.bs.toast", () =>
      toastElement.remove()
    );
  }

  const confirmationModalEl = document.getElementById("confirmationModal");
  const confirmationModal = new bootstrap.Modal(confirmationModalEl);
  function showConfirmationModal(message) {
    return new Promise((resolve) => {
      const confirmBtn = document.getElementById("confirm-danger-btn");
      const cancelBtn = document.getElementById("confirm-cancel-btn");
      document.getElementById("confirmationModalBody").textContent = message;

      const handleConfirm = () => {
        resolve(true);
        confirmationModal.hide();
      };
      const handleCancel = () => {
        resolve(false);
        confirmationModal.hide();
      };

      // Use .cloneNode to remove old listeners before adding new ones
      const newConfirmBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
      newConfirmBtn.addEventListener("click", handleConfirm);

      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      newCancelBtn.addEventListener("click", handleCancel);

      confirmationModalEl.addEventListener(
        "hidden.bs.modal",
        () => handleCancel(),
        { once: true }
      );

      confirmationModal.show();
    });
  }

  // ===================================================================
  // 2. CORE UI & NAVIGATION LOGIC
  // ===================================================================
  const wrapper = document.getElementById("wrapper");
  const menuToggle = document.getElementById("menu-toggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", () =>
      wrapper.classList.toggle("toggled")
    );
  }
  const pageTitle = document.getElementById("page-title");
  const navLinks = document.querySelectorAll(
    "#sidebar-wrapper .list-group-item"
  );
  const sections = document.querySelectorAll(".admin-section");
  const clockElement = document.getElementById("realtime-clock");

  // --- Sidebar Toggle ---
  if (menuToggle) {
    menuToggle.addEventListener("click", () =>
      wrapper.classList.toggle("toggled")
    );
  }

  // --- Real-time Clock ---
  if (clockElement) {
    const updateClock = () => {
      clockElement.textContent = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    };
    setInterval(updateClock, 60000); // Update every minute is enough
    updateClock();
  }

  // --- View Switching Function ---
  const switchView = (targetId = "dashboard") => {
    const activeLink = document.querySelector(`a[href="#${targetId}"]`);
    if (pageTitle && activeLink) {
      pageTitle.textContent = activeLink.textContent.trim();
    }

    navLinks.forEach((link) =>
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${targetId}`
      )
    );

    sections.forEach((section) => {
      if (section.id === targetId) {
        section.classList.remove("d-none");
        // Use a class to trigger animation for better performance
        section.classList.add("fade-in-active");
      } else {
        section.classList.add("d-none");
        section.classList.remove("fade-in-active");
      }
    });

    // Load data for the activated section
    switch (targetId) {
      case "dashboard":
        loadDashboardStats();
        break;
      case "products":
        loadProducts();
        break;
      case "messages":
        loadMessages();
        break;
      case "settings":
        loadSettings();
        break;
      case "profile":
        loadProfile();
        break;
    }
  };

  // --- Sidebar Link Event Listeners ---
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      switchView(targetId);
      if (window.innerWidth < 992 && wrapper.classList.contains("toggled")) {
        wrapper.classList.remove("toggled");
      }
    });
  });

  // --- Profile Dropdown Link Handler ---
  const profileSettingsLink = document.querySelector(
    '#profile-dropdown a[href*="settings"]'
  );
  if (profileSettingsLink) {
    profileSettingsLink.addEventListener("click", (e) => {
      e.preventDefault();
      switchView("settings");
    });
  }
  // --- Profile Dropdown Link Handler (For Profile & Settings) ---
  document
    .querySelectorAll("#profile-dropdown .dropdown-item")
    .forEach((link) => {
      const targetId = link.getAttribute("href");
      // Only add listeners to links that navigate within the page (start with #)
      if (targetId && targetId.startsWith("#")) {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          switchView(targetId.substring(1));
        });
      }
    });

  // --- Logout Logic ---

  document.getElementById("logout-button")?.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent the link from navigating immediately

    const logoutOverlay = document.getElementById("logout-overlay");

    // 1. Show the dynamic overlay
    if (logoutOverlay) {
      logoutOverlay.classList.add("show");
    }

    // 2. Wait 1.5 seconds for the animation to be appreciated
    setTimeout(() => {
      // 3. Clear all user data from storage
      localStorage.clear();

      // 4. Redirect to the login page
      window.location.href = "login.html"; // Ensure this is the correct login page name
    }, 1500);
  });

  // ===================================================================
  // 3. REUSABLE HELPER FUNCTIONS
  // ===================================================================
  const fetchData = async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Network response was not ok");
    return response.json();
  };

  const deleteData = async (endpoint, id) => {
    return fetch(`${API_BASE_URL}/${endpoint}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const setButtonLoading = (button, isLoading, text = "Submit") => {
    if (!button) return;
    button.disabled = isLoading;
    button.innerHTML = isLoading
      ? `<span class="spinner-border spinner-border-sm"></span> Processing...`
      : text;
  };

  // ===================================================================
  // 3. DASHBOARD LOGIC
  // ===================================================================
  const loadDashboardStats = async () => {
    try {
      const [products, messages] = await Promise.all([
        fetchData("products"),
        fetchData("messages"),
      ]);
      document.getElementById("product-count").textContent = products.length;
      document.getElementById("message-count").textContent = messages.length;
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    }
  };

  const dashboardSection = document.getElementById("dashboard");
  if (dashboardSection) {
    dashboardSection.addEventListener("click", (e) => {
      const statCard = e.target.closest(".stat-card");
      if (statCard) {
        e.preventDefault();
        const targetId = statCard.getAttribute("href").substring(1);
        switchView(targetId);
      }
    });
  }

  // ===================================================================
  // 4. PRODUCTS CRUD LOGIC
  // ===================================================================
  const productForm = document.getElementById("product-form");
  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitButton = productForm.querySelector('button[type="submit"]');
      setButtonLoading(submitButton, true, "Add Product");
      try {
        // ... (fetch logic)
        showToast("Product added successfully!", "success"); // REPLACED alert()
        productForm.reset();
        loadProducts();
        loadDashboardStats();
      } catch (err) {
        showToast(err.message, "danger"); // REPLACED alert()
      } finally {
        setButtonLoading(submitButton, false, "Add Product");
      }
    });
  }

  const productsTableBody = document.getElementById("products-table-body");
  if (productsTableBody) {
    productsTableBody.addEventListener("click", async (e) => {
      const target = e.target;
      const id = target.dataset.id;
      if (target.classList.contains("delete-btn")) {
        // REPLACED confirm() with our new modal
        const isConfirmed = await showConfirmationModal(
          "Are you sure you want to delete this product? This action cannot be undone."
        );
        if (isConfirmed) {
          await deleteData("products", id);
          showToast("Product deleted successfully.", "success");
          loadProducts();
          loadDashboardStats();
        }
      }
      // ... (edit button logic remains the same) ...
    });
  }

  const editForm = document.getElementById("edit-product-form");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      // ... (submit logic) ...
      try {
        // ... (fetch logic) ...
        showToast("Product updated successfully!", "success"); // REPLACED alert()
        bootstrap.Modal.getInstance(
          document.getElementById("editProductModal")
        )?.hide();
        loadProducts();
      } catch (err) {
        showToast(err.message, "danger"); // REPLACED alert()
      } finally {
        // ... (reset button logic) ...
      }
    });
  }

  const loadProducts = async () => {
    try {
      const products = await fetchData("products");
      productsTableBody.innerHTML = products
        .map(
          (p) => `
                <tr>
                    <td><img src="${SERVER_URL}/${p.imageUrl}" alt="${
            p.name
          }" class="img-thumbnail" width="50"></td>
                    <td>${p.name}</td>
                    <td>${p.category}</td>
                    <td>${new Date(p.updatedAt).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-sm btn-info edit-btn" data-id="${
                          p._id
                        }" data-bs-toggle="modal" data-bs-target="#editProductModal">Edit</button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${
                          p._id
                        }">Delete</button>
                    </td>
                </tr>`
        )
        .join("");
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitButton = productForm.querySelector('button[type="submit"]');
      setButtonLoading(submitButton, true);

      try {
        const response = await fetch(`${API_BASE_URL}/products`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: new FormData(productForm),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        alert(result.message);
        productForm.reset();
        loadProducts();
        loadDashboardStats();
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        setButtonLoading(submitButton, false, "Add Product");
      }
    });
  }

  if (productsTableBody) {
    productsTableBody.addEventListener("click", async (e) => {
      const target = e.target;
      const id = target.dataset.id;

      if (target.classList.contains("delete-btn")) {
        if (confirm("Are you sure you want to delete this product?")) {
          await deleteData("products", id);
          loadProducts();
          loadDashboardStats();
        }
      }

      if (target.classList.contains("edit-btn")) {
        const product = await fetchData(`products/${id}`);
        document.getElementById("editProductId").value = product._id;
        document.getElementById("editProductName").value = product.name;
        document.getElementById("editProductDesc").value = product.description;
        document.getElementById("editProductCat").value = product.category;
        document.getElementById(
          "currentProductImage"
        ).src = `${SERVER_URL}/${product.imageUrl}`;
        document.getElementById("editProductImage").value = "";
      }
    });
  }

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("editProductId").value;
      const submitButton = editForm.querySelector('button[type="submit"]');
      setButtonLoading(submitButton, true);

      try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: new FormData(editForm),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        alert(result.message);
        bootstrap.Modal.getInstance(
          document.getElementById("editProductModal")
        )?.hide();
        loadProducts();
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        setButtonLoading(submitButton, false, "Save Changes");
      }
    });
  }

  // ===================================================================
  // 5. MESSAGES LOGIC
  // ===================================================================
  const messagesTableBody = document.getElementById("messages-table-body");

  const loadMessages = async () => {
    if (!messagesTableBody) return;
    try {
      const messages = await fetchData("messages");
      if (messages.length === 0) {
        messagesTableBody.innerHTML =
          '<tr><td colspan="5" class="text-center text-muted py-4">You have no new messages.</td></tr>';
        return;
      }
      messagesTableBody.innerHTML = messages
        .map(
          (m, index) => `
                <tr class="message-row" style="cursor: pointer;" data-id="${
                  m._id
                }">
                    <th scope="row">${index + 1}</th>
                    <td>${new Date(m.createdAt).toLocaleDateString()}</td>
                    <td>${m.name}</td>
                    <td>${m.subject}</td>
                    <td><button class="btn btn-sm btn-outline-danger delete-btn" data-id="${
                      m._id
                    }">Delete</button></td>
                </tr>`
        )
        .join("");
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  if (messagesTableBody) {
    messagesTableBody.addEventListener("click", async (e) => {
      const deleteButton = e.target.closest(".delete-btn");
      if (deleteButton) {
        e.stopPropagation();
        if (confirm("Are you sure?")) {
          await deleteData("messages", deleteButton.dataset.id);
          loadMessages();
          loadDashboardStats();
        }
      } else {
        const row = e.target.closest(".message-row");
        if (row) {
          const message = await fetchData(`messages/${row.dataset.id}`);
          document.getElementById("messageModalSubject").textContent =
            message.subject;
          document.getElementById(
            "messageModalFrom"
          ).textContent = `${message.name} (${message.email})`;
          document.getElementById("messageModalDate").textContent = new Date(
            message.createdAt
          ).toLocaleString();
          document.getElementById("messageModalBody").textContent =
            message.message;
          new bootstrap.Modal(
            document.getElementById("viewMessageModal")
          ).show();
        }
      }
    });
  }

  // ===================================================================
  // 6. SETTINGS LOGIC
  // ===================================================================
  const settingsForm = document.getElementById("settings-form");

  const loadSettings = async () => {
    if (!settingsForm) return;
    try {
      const settings = await fetchData("settings");
      for (const key in settings) {
        if (settingsForm[key]) settingsForm[key].value = settings[key];
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  if (settingsForm) {
    settingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitButton = settingsForm.querySelector('button[type="submit"]');
      setButtonLoading(submitButton, true);
      const settingsData = Object.fromEntries(new FormData(settingsForm));

      try {
        await fetch(`${API_BASE_URL}/settings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(settingsData),
        });
        alert("Settings saved successfully!");
      } catch (err) {
        alert("Failed to save settings.");
      } finally {
        setButtonLoading(submitButton, false, "Save Settings");
      }
    });
  }

  // ===================================================================
  // --- Profile Page Logic ---
  // ===================================================================

  const profileDetailsForm = document.getElementById("profile-details-form");
  const profilePasswordForm = document.getElementById("profile-password-form");
  const profileAvatarForm = document.getElementById("profile-avatar-form");
  const avatarUploadInput = document.getElementById("avatarUpload");

  async function loadProfile() {
    try {
      const user = await fetchData("auth/profile");
      document.getElementById("profileFullName").value = user.fullName;
      document.getElementById("profileEmail").value = user.email;
      document.getElementById(
        "profile-avatar-preview"
      ).src = `${SERVER_URL}/${user.avatarUrl}`;
    } catch (err) {
      showToast("Failed to load profile data.", "danger");
    }
  }

  // Update Name
  if (profileDetailsForm) {
    profileDetailsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitButton = profileDetailsForm.querySelector(
        'button[type="submit"]'
      );
      setButtonLoading(submitButton, true, "Update Details");
      try {
        const formData = new FormData();
        formData.append(
          "fullName",
          document.getElementById("profileFullName").value
        );

        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        showToast(result.message, "success");
        localStorage.setItem("adminName", result.userName); // Update localStorage
        document.getElementById("admin-name-display").textContent =
          result.userName; // Update navbar
      } catch (err) {
        showToast(err.message, "danger");
      } finally {
        setButtonLoading(submitButton, false, "Update Details");
      }
    });
  }

  // Change Password
  if (profilePasswordForm) {
    profilePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitButton = profilePasswordForm.querySelector(
        'button[type="submit"]'
      );
      setButtonLoading(submitButton, true, "Change Password");
      try {
        const formData = new FormData(profilePasswordForm);
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        showToast(result.message, "success");
        profilePasswordForm.reset();
      } catch (err) {
        showToast(err.message, "danger");
      } finally {
        setButtonLoading(submitButton, false, "Change Password");
      }
    });
  }

  // Upload Avatar
  if (avatarUploadInput) {
    avatarUploadInput.addEventListener("change", async () => {
      if (avatarUploadInput.files.length > 0) {
        const formData = new FormData();
        formData.append("avatar", avatarUploadInput.files[0]);

        try {
          const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message);

          showToast(result.message, "success");
          document.getElementById(
            "profile-avatar-preview"
          ).src = `${SERVER_URL}/${result.avatarUrl}`; // Update profile page
          document.querySelector(
            "#profile-dropdown img"
          ).src = `${SERVER_URL}/${result.avatarUrl}`; // Update navbar
          localStorage.setItem("adminAvatar", result.avatarUrl);
        } catch (err) {
          showToast(err.message, "danger");
        }
      }
    });
  }

  // ===================================================================
  // 7. INITIAL PAGE LOAD
  // ===================================================================
  const adminName = localStorage.getItem("adminName");
  const adminAvatar = localStorage.getItem("adminAvatar");
  if (adminName)
    document.querySelector("#profile-dropdown strong").textContent = adminName;
  if (adminAvatar)
    document.querySelector("#profile-dropdown img").src =
      adminAvatar.startsWith("http")
        ? adminAvatar
        : `${SERVER_URL}/${adminAvatar}`;

  switchView("dashboard"); // Load the dashboard by default
});

document.addEventListener("DOMContentLoaded", () => {
  // Helper function to handle the loading state of buttons
  function setButtonLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    if (isLoading) {
      button.classList.add("loading");
    } else {
      button.classList.remove("loading");
    }
  }

  // --- 1. Login Form Handler ---
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const loginButton = document.getElementById("login-button");
      setButtonLoading(loginButton, true);

      setTimeout(() => {
        alert("Authorization successful. Accessing dashboard...");
        setButtonLoading(loginButton, false);
        // window.location.href = 'dashboard.html';
      }, 1500);
    });
  }

  // --- 2. Signup Form Handler ---
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const emailInput = document.getElementById("email");
    const signupButton = document.getElementById("signup-button");

    // --- Password Criteria Elements ---
    const lengthCheck = document.getElementById("length-check");
    const upperCheck = document.getElementById("upper-check");
    const numberCheck = document.getElementById("number-check");

    const validatePassword = () => {
      const pass = passwordInput.value;
      const hasLength = pass.length >= 8;
      const hasUpper = /[A-Z]/.test(pass);
      const hasNumber = /[0-9]/.test(pass);

      lengthCheck.classList.toggle("valid", hasLength);
      upperCheck.classList.toggle("valid", hasUpper);
      numberCheck.classList.toggle("valid", hasNumber);

      return hasLength && hasUpper && hasNumber;
    };

    passwordInput.addEventListener("input", validatePassword);

    signupForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const isPasswordValid = validatePassword();
      const email = emailInput.value;
      const passwordsMatch = passwordInput.value === confirmPasswordInput.value;
      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      // --- Validation Checks ---
      if (!isEmailValid) {
        alert("Please enter a valid email address.");
        return;
      }
      if (!isPasswordValid) {
        alert("Please ensure your password meets all the criteria.");
        return;
      }
      if (!passwordsMatch) {
        alert("Passwords do not match. Please try again.");
        return;
      }

      setButtonLoading(signupButton, true);

      setTimeout(() => {
        alert(
          "Account request submitted successfully. You will be notified upon approval."
        );
        setButtonLoading(signupButton, false);
        window.location.href = "admin.html";
      }, 1500);
    });
  }

  // --- 3. Forgot Password Form Handler ---
  const forgotPasswordForm = document.getElementById("forgot-password-form");
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const resetButton = document.getElementById("reset-button");
      setButtonLoading(resetButton, true);

      setTimeout(() => {
        alert(
          "If an account exists for this email, a recovery link has been dispatched."
        );
        setButtonLoading(resetButton, false);
      }, 1500);
    });
  }

  // --- 4. Show/Hide Password Toggle ---
  document.querySelectorAll(".password-toggle-icon").forEach((icon) => {
    icon.addEventListener("click", () => {
      const input = icon.previousElementSibling;
      if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("bi-eye-slash-fill");
        icon.classList.add("bi-eye-fill");
      } else {
        input.type = "password";
        icon.classList.remove("bi-eye-fill");
        icon.classList.add("bi-eye-slash-fill");
      }
    });
  });
});

/* =================================================================== */
/*             BIOMED SOLUTIONS - FUTURISTIC ADMIN DASHBOARD SCRIPT    */
/* =================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // --- 0. CONFIG & AUTHENTICATION ---
  const API_BASE_URL = "http://localhost:3000/api";
  const SERVER_URL = "http://localhost:3000";
  const token = localStorage.getItem("adminToken");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // --- 1. DOM ELEMENT SELECTION ---
  const wrapper = document.getElementById("wrapper");
  const menuToggle = document.getElementById("menu-toggle");
  const pageTitle = document.getElementById("page-title");
  const navLinks = document.querySelectorAll(
    "#sidebar-wrapper .list-group-item"
  );
  const sections = document.querySelectorAll(".admin-section");
  const clockElement = document.getElementById("realtime-clock");
  const productCountEl = document.getElementById("product-count");
  const messageCountEl = document.getElementById("message-count");
  const productsTableBody = document.getElementById("products-table-body");
  const messagesTableBody = document.getElementById("messages-table-body");

  // ===================================================================
  //                         2. CORE UI & NAVIGATION
  // ===================================================================

  // --- Sidebar Toggle ---
  if (menuToggle) {
    menuToggle.addEventListener("click", () =>
      wrapper.classList.toggle("toggled")
    );
  }

  // --- Real-time Clock ---
  if (clockElement) {
    const updateClock = () => {
      clockElement.textContent = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    };
    setInterval(updateClock, 60000);
    updateClock();
  }

  /**
   * Main function to switch between dashboard sections with animations.
   * @param {string} targetId - The ID of the section to display.
   */
  const switchView = (targetId = "dashboard") => {
    const activeLink = document.querySelector(`a[href="#${targetId}"]`);
    if (pageTitle && activeLink)
      pageTitle.textContent = activeLink.textContent.trim();

    navLinks.forEach((link) =>
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${targetId}`
      )
    );

    sections.forEach((section) => {
      section.classList.toggle("d-none", section.id !== targetId);
    });

    const activeSection = document.getElementById(targetId);
    if (activeSection) {
      activeSection.classList.remove("d-none");
      activeSection.classList.add("fade-in-active");
    }

    // Load data specifically for the new view
    loadDataForView(targetId);
  };

  // --- Event Listeners for Navigation ---
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      switchView(targetId);
      if (window.innerWidth < 992 && wrapper.classList.contains("toggled")) {
        wrapper.classList.remove("toggled");
      }
    });
  });

  // --- Handler for clicking on a stat card to navigate ---
  document.getElementById("dashboard")?.addEventListener("click", (e) => {
    const statCard = e.target.closest(".stat-card");
    if (statCard) {
      e.preventDefault();
      switchView(statCard.dataset.section);
    }
  });

  // --- Logout Logic ---
  // REPLACE your old logout logic with this new version in js/admin-dashboard.js

  // --- Logout Logic ---
  document.getElementById("logout-button")?.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent the link from navigating immediately

    const logoutOverlay = document.getElementById("logout-overlay");

    // 1. Show the dynamic overlay
    if (logoutOverlay) {
      logoutOverlay.classList.add("show");
    }

    // 2. Wait for the animation to be appreciated
    setTimeout(() => {
      // 3. Clear all user data from storage
      localStorage.clear();

      // 4. Redirect to the login page
      window.location.href = "login.html"; // Make sure this is the correct name of your login file
    }, 1500); // 1.5 second delay
  });

  // ===================================================================
  //                         3. DATA LOADING & RENDERING
  // ===================================================================

  /**
   * Router function to load the appropriate data based on the current view.
   * @param {string} viewId - The ID of the current section.
   */
  function loadDataForView(viewId) {
    switch (viewId) {
      case "dashboard":
        loadDashboardStats();
        break;
      case "products":
        loadProducts();
        break;
      // Add cases for messages and settings here
    }
  }

  /**
   * Animates a number from 0 to a target value.
   * @param {HTMLElement} el - The element containing the number.
   * @param {number} target - The final number.
   */
  function animateCountUp(el, target) {
    let current = 0;
    const duration = 1500; // ms
    const stepTime = Math.abs(Math.floor(duration / target));
    const timer = setInterval(() => {
      current += 1;
      el.textContent = current;
      if (current === target) {
        clearInterval(timer);
      }
    }, stepTime);
  }

  /**
   * Fetches and animates the stats for the dashboard.
   */
  async function loadDashboardStats() {
    try {
      const [products, messages] = await Promise.all([
        fetchData("products"),
        fetchData("messages"),
      ]);
      animateCountUp(document.getElementById("product-count"), products.length);
      animateCountUp(document.getElementById("message-count"), messages.length);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    }
  }

  /**
   * Renders a skeleton loading state for tables.
   * @param {HTMLElement} tableBody - The tbody element to fill.
   * @param {number} rows - The number of skeleton rows to create.
   * @param {number} cols - The number of columns.
   */
  function renderSkeleton(tableBody, rows, cols) {
    let skeletonHTML = "";
    for (let i = 0; i < rows; i++) {
      skeletonHTML += "<tr>";
      for (let j = 0; j < cols; j++) {
        skeletonHTML += '<td><div class="skeleton-loader"></div></td>';
      }
      skeletonHTML += "</tr>";
    }
    tableBody.innerHTML = skeletonHTML;
  }

  /**
   * Fetches and renders the product list with animations.
   */
  async function loadProducts() {
    const productsTableBody = document.getElementById("products-table-body");
    renderSkeleton(productsTableBody, 5, 5); // Show skeleton loader first

    try {
      const products = await fetchData("products");
      productsTableBody.innerHTML = ""; // Clear skeleton
      products.forEach((p, index) => {
        const row = document.createElement("tr");
        row.style.setProperty("--animation-delay", `${index * 50}ms`);
        row.innerHTML = `
                    <td><img src="${SERVER_URL}/${p.imageUrl}" alt="${
          p.name
        }" class="table-img"></td>
                    <td>${p.name}</td>
                    <td>${p.category}</td>
                    <td>${new Date(p.updatedAt).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-sm btn-info edit-btn" data-id="${
                          p._id
                        }">Edit</button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${
                          p._id
                        }">Delete</button>
                    </td>
                `;
        productsTableBody.appendChild(row);
      });
    } catch (err) {
      productsTableBody.innerHTML =
        '<tr><td colspan="5" class="text-center text-danger">Failed to load products.</td></tr>';
      console.error("Failed to load products:", err);
    }
  }

  // ===================================================================
  //                         4. HELPER FUNCTIONS
  // ===================================================================
  const fetchData = async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
    return response.json();
  };

  // ===================================================================
  //                         5. INITIALIZATION
  // ===================================================================
  const adminName = localStorage.getItem("adminName");
  if (adminName)
    document.querySelector("#profile-dropdown strong").textContent = adminName;

  // Initial view load
  switchView("dashboard");
});
