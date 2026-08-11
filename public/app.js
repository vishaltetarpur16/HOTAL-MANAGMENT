// Element References
const roomsGrid = document.getElementById("rooms-grid");
const roomSelect = document.getElementById("roomId");
const bookingForm = document.getElementById("booking-form");
const bookingMsg = document.getElementById("booking-msg");
const bookingsBody = document.getElementById("bookings-body");
const headerUser = document.getElementById("header-user");
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const btnDemoAdmin = document.getElementById("btn-demo-admin");
const btnDemoStaff = document.getElementById("btn-demo-staff");
const btnCloseModal = document.getElementById("btn-close-modal");

// Admin Panel Elements
const adminPanelOverlay = document.getElementById("admin-panel-overlay");
const btnCloseAdmin = document.getElementById("btn-close-admin");
const adminTabBtns = document.querySelectorAll(".admin-tab-btn");
const adminTabPanes = document.querySelectorAll(".admin-tab-pane");
const adminAddRoomForm = document.getElementById("admin-add-room-form");
const adminRoomsBody = document.getElementById("admin-rooms-body");
const adminAddUserForm = document.getElementById("admin-add-user-form");
const adminUsersBody = document.getElementById("admin-users-body");

// Analytics Elements
const analyticsTotalRevenue = document.getElementById("analytics-total-revenue");
const analyticsProjectedRevenue = document.getElementById("analytics-projected-revenue");
const analyticsOccupancyRate = document.getElementById("analytics-occupancy-rate");
const analyticsAvgNights = document.getElementById("analytics-avg-nights");

// KPI & Extra UI Elements
const kpiTotalRooms = document.getElementById("kpi-total-rooms");
const kpiAvailable = document.getElementById("kpi-available");
const kpiOccupied = document.getElementById("kpi-occupied");
const kpiActiveBookings = document.getElementById("kpi-active-bookings");
const liveClock = document.getElementById("live-clock");
const tableSearchInput = document.getElementById("table-search-input");
const toastContainer = document.getElementById("toast-container");
const filterBtns = document.querySelectorAll(".segment-btn");

let currentUser = null;
let authToken = localStorage.getItem("hotel_auth_token") || null;
let allRoomsData = [];
let allBookingsData = [];
let allUsersData = [];
let activeRoomFilter = "all";

// ---------- Live Clock ----------
function updateClock() {
  if (!liveClock) return;
  const now = new Date();
  liveClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// Set default check-in date to today
const checkInInput = document.getElementById("checkInDate");
if (checkInInput) {
  checkInInput.value = new Date().toISOString().split("T")[0];
}

// ---------- Toast Notifications ----------
function showToast(message, type = "success") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;
  const icon = type === "success" ? "fa-circle-check" : "fa-triangle-exclamation";
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(40px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ---------- Auth Handlers ----------
async function checkAuth() {
  if (!authToken) {
    currentUser = null;
    renderHeaderUser();
    return;
  }

  try {
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
    } else {
      currentUser = null;
      authToken = null;
      localStorage.removeItem("hotel_auth_token");
    }
  } catch (err) {
    currentUser = null;
  }
  renderHeaderUser();
}

function renderHeaderUser() {
  if (!headerUser) return;
  if (currentUser) {
    const isAdmin = currentUser.role === "Administrator";
    headerUser.innerHTML = `
      ${isAdmin ? `<button id="btn-open-admin" class="btn btn-admin-nav"><i class="fa-solid fa-sliders"></i> Admin Panel</button>` : ""}
      <div class="user-profile">
        <span class="user-avatar-circle">${currentUser.avatar}</span>
        <div class="user-details">
          <span class="user-name">${currentUser.name}</span>
          <span class="user-role">${currentUser.role}</span>
        </div>
      </div>
      <button id="btn-logout" class="btn btn-logout-nav"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
    `;
    document.getElementById("btn-logout").addEventListener("click", performLogout);
    if (isAdmin) {
      document.getElementById("btn-open-admin").addEventListener("click", openAdminPanel);
    }
    closeLoginModal();
  } else {
    headerUser.innerHTML = `
      <button id="btn-open-login" class="btn btn-login-nav"><i class="fa-solid fa-user-lock"></i> Staff Login</button>
    `;
    document.getElementById("btn-open-login").addEventListener("click", openLoginModal);
  }
}

function openLoginModal() {
  if (loginError) loginError.textContent = "";
  if (loginModal) loginModal.classList.remove("hidden");
}

function closeLoginModal() {
  if (loginModal) loginModal.classList.add("hidden");
}

async function performLogin(username, password) {
  if (loginError) loginError.textContent = "";
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem("hotel_auth_token", authToken);
      renderHeaderUser();
      showToast(`Welcome back, ${currentUser.name}!`, "success");
      loadRooms();
      loadBookings();
    } else {
      if (loginError) loginError.textContent = data.error || "Login failed.";
    }
  } catch (err) {
    if (loginError) loginError.textContent = "Network error while logging in.";
  }
}

async function performLogout() {
  if (authToken) {
    await fetch("/api/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` }
    });
  }
  authToken = null;
  currentUser = null;
  localStorage.removeItem("hotel_auth_token");
  renderHeaderUser();
  closeAdminPanel();
  showToast("Logged out successfully.", "success");
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    await performLogin(username, password);
  });
}

if (btnDemoAdmin) {
  btnDemoAdmin.addEventListener("click", () => {
    document.getElementById("login-username").value = "admin";
    document.getElementById("login-password").value = "admin123";
    performLogin("admin", "admin123");
  });
}

if (btnDemoStaff) {
  btnDemoStaff.addEventListener("click", () => {
    document.getElementById("login-username").value = "staff";
    document.getElementById("login-password").value = "staff123";
    performLogin("staff", "staff123");
  });
}

if (btnCloseModal) {
  btnCloseModal.addEventListener("click", closeLoginModal);
}

if (loginModal) {
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      closeLoginModal();
    }
  });
}

// ---------- Admin Panel Logic ----------
function openAdminPanel() {
  if (!currentUser || currentUser.role !== "Administrator") {
    showToast("Administrator privileges required.", "error");
    return;
  }
  if (adminPanelOverlay) adminPanelOverlay.classList.remove("hidden");
  renderAdminRoomsTable();
  loadAdminUsers();
  renderAdminAnalytics();
}

function closeAdminPanel() {
  if (adminPanelOverlay) adminPanelOverlay.classList.add("hidden");
}

if (btnCloseAdmin) {
  btnCloseAdmin.addEventListener("click", closeAdminPanel);
}

if (adminPanelOverlay) {
  adminPanelOverlay.addEventListener("click", (e) => {
    if (e.target === adminPanelOverlay) {
      closeAdminPanel();
    }
  });
}

adminTabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    adminTabBtns.forEach((b) => b.classList.remove("active"));
    adminTabPanes.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const targetId = btn.getAttribute("data-tab");
    const targetPane = document.getElementById(targetId);
    if (targetPane) targetPane.classList.add("active");
  });
});

// Admin Add Room Handler
if (adminAddRoomForm) {
  adminAddRoomForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!authToken) return;

    const payload = {
      id: document.getElementById("new-room-id").value,
      type: document.getElementById("new-room-type").value,
      price: document.getElementById("new-room-price").value
    };

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Room ${payload.id} (${payload.type}) added successfully!`, "success");
        adminAddRoomForm.reset();
        await loadRooms();
        renderAdminRoomsTable();
        renderAdminAnalytics();
      } else {
        showToast(data.error || "Failed to add room", "error");
      }
    } catch (err) {
      showToast("Server error while adding room.", "error");
    }
  });
}

function renderAdminRoomsTable() {
  if (!adminRoomsBody) return;
  adminRoomsBody.innerHTML = "";

  allRoomsData.forEach((room) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>Room ${room.id}</strong></td>
      <td>${room.type}</td>
      <td>₹${room.price}</td>
      <td><span class="room-badge-pill ${room.status === "Available" ? "available" : "occupied"}">${room.status}</span></td>
      <td style="text-align: right;">
        <button class="btn-danger-sm btn-delete-room" data-id="${room.id}" ${room.status === "Occupied" ? "disabled style='opacity:0.5; cursor:not-allowed;'" : ""}>
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </td>
    `;
    adminRoomsBody.appendChild(tr);
  });

  document.querySelectorAll(".btn-delete-room").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const roomId = btn.getAttribute("data-id");
      if (!confirm(`Are you sure you want to delete Room ${roomId}?`)) return;

      try {
        const res = await fetch(`/api/rooms/${roomId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` }
        });
        const data = await res.json();

        if (res.ok) {
          showToast(data.message, "success");
          await loadRooms();
          renderAdminRoomsTable();
          renderAdminAnalytics();
        } else {
          showToast(data.error, "error");
        }
      } catch (err) {
        showToast("Error deleting room.", "error");
      }
    });
  });
}

// Admin Users Handlers
async function loadAdminUsers() {
  if (!authToken) return;
  try {
    const res = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.ok) {
      allUsersData = await res.json();
      renderAdminUsersTable();
    }
  } catch (err) {
    console.error("Failed to load users:", err);
  }
}

function renderAdminUsersTable() {
  if (!adminUsersBody) return;
  adminUsersBody.innerHTML = "";

  allUsersData.forEach((u) => {
    const tr = document.createElement("tr");
    const isSelf = currentUser && currentUser.id === u.id;
    tr.innerHTML = `
      <td>
        <span style="margin-right: 6px;">${u.avatar}</span>
        <strong>${u.name}</strong> ${isSelf ? `<small style="color: var(--accent-blue);">(You)</small>` : ""}
      </td>
      <td><code>${u.username}</code></td>
      <td><span class="status-pill ${u.role === "Administrator" ? "pill-checkedout" : "pill-checkedin"}">${u.role}</span></td>
      <td style="text-align: right;">
        ${
          !isSelf
            ? `<button class="btn-danger-sm btn-delete-user" data-id="${u.id}"><i class="fa-solid fa-user-minus"></i> Delete</button>`
            : `<span style="color: var(--text-muted); font-size: 12px;">Active Session</span>`
        }
      </td>
    `;
    adminUsersBody.appendChild(tr);
  });

  document.querySelectorAll(".btn-delete-user").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-id");
      if (!confirm("Are you sure you want to delete this staff user account?")) return;

      try {
        const res = await fetch(`/api/users/${userId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` }
        });
        const data = await res.json();

        if (res.ok) {
          showToast(data.message, "success");
          loadAdminUsers();
        } else {
          showToast(data.error, "error");
        }
      } catch (err) {
        showToast("Failed to delete user.", "error");
      }
    });
  });
}

if (adminAddUserForm) {
  adminAddUserForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!authToken) return;

    const payload = {
      name: document.getElementById("new-user-name").value,
      username: document.getElementById("new-user-username").value,
      password: document.getElementById("new-user-password").value,
      role: document.getElementById("new-user-role").value
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Staff account "${payload.name}" created!`, "success");
        adminAddUserForm.reset();
        loadAdminUsers();
      } else {
        showToast(data.error || "Failed to create user", "error");
      }
    } catch (err) {
      showToast("Server error while adding user account.", "error");
    }
  });
}

function renderAdminAnalytics() {
  const settledRevenue = allBookingsData
    .filter((b) => b.status === "Checked-Out" && b.totalBill)
    .reduce((sum, b) => sum + Number(b.totalBill), 0);

  const activeProjected = allBookingsData
    .filter((b) => b.status === "Checked-In")
    .reduce((sum, b) => sum + Number(b.pricePerNight * b.nights), 0);

  const totalRooms = allRoomsData.length;
  const occupiedRooms = allRoomsData.filter((r) => r.status === "Occupied").length;
  const occPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const totalNights = allBookingsData.reduce((sum, b) => sum + Number(b.nights || 0), 0);
  const avgNights = allBookingsData.length > 0 ? (totalNights / allBookingsData.length).toFixed(1) : 0;

  if (analyticsTotalRevenue) analyticsTotalRevenue.textContent = `₹${settledRevenue.toLocaleString()}`;
  if (analyticsProjectedRevenue) analyticsProjectedRevenue.textContent = `₹${activeProjected.toLocaleString()}`;
  if (analyticsOccupancyRate) analyticsOccupancyRate.textContent = `${occPercentage}%`;
  if (analyticsAvgNights) analyticsAvgNights.textContent = `${avgNights} Nights`;
}

// ---------- Data Loaders & Stats ----------
async function loadRooms() {
  try {
    const res = await fetch("/api/rooms");
    allRoomsData = await res.json();
    renderRooms();
    updateKPIs();
  } catch (err) {
    console.error("Failed to load rooms:", err);
  }
}

function renderRooms() {
  roomsGrid.innerHTML = "";
  roomSelect.innerHTML = "";

  const filtered = allRoomsData.filter((r) => {
    if (activeRoomFilter === "all") return true;
    return r.status === activeRoomFilter;
  });

  filtered.forEach((room) => {
    const isAvail = room.status === "Available";
    const tile = document.createElement("div");
    tile.className = `room-tile-human ${isAvail ? "available" : "occupied"}`;
    tile.innerHTML = `
      <div class="room-tile-top">
        <span class="room-num">Room ${room.id}</span>
        <span class="room-dot"></span>
      </div>
      <span class="room-type-lbl">${room.type} Suite</span>
      <span class="room-rate">₹${room.price} <small style="font-weight: normal; color: var(--text-muted);">/ night</small></span>
      <span class="room-badge-pill">${room.status}</span>
    `;
    roomsGrid.appendChild(tile);
  });

  // Populate Select Options for available rooms
  allRoomsData.forEach((room) => {
    if (room.status === "Available") {
      const opt = document.createElement("option");
      opt.value = room.id;
      opt.textContent = `Room ${room.id} - ${room.type} (₹${room.price}/night)`;
      roomSelect.appendChild(opt);
    }
  });

  if (roomSelect.options.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "No rooms available for check-in";
    opt.disabled = true;
    roomSelect.appendChild(opt);
  }
}

async function loadBookings() {
  try {
    const res = await fetch("/api/bookings");
    allBookingsData = await res.json();
    renderBookingsTable();
    updateKPIs();
    renderAdminAnalytics();
  } catch (err) {
    console.error("Failed to load bookings:", err);
  }
}

function renderBookingsTable() {
  bookingsBody.innerHTML = "";
  const query = tableSearchInput ? tableSearchInput.value.toLowerCase().trim() : "";

  const filtered = allBookingsData
    .slice()
    .reverse()
    .filter((b) => {
      if (!query) return true;
      return (
        b.guestName.toLowerCase().includes(query) ||
        String(b.roomId).includes(query) ||
        b.roomType.toLowerCase().includes(query)
      );
    });

  if (filtered.length === 0) {
    bookingsBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
          <i class="fa-solid fa-folder-open" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
          No bookings match the search criteria.
        </td>
      </tr>
    `;
    return;
  }

  const isAdmin = currentUser && currentUser.role === "Administrator";

  filtered.forEach((b) => {
    const row = document.createElement("tr");
    const isCheckedIn = b.status === "Checked-In";
    const statusBadge = isCheckedIn
      ? `<span class="status-pill pill-checkedin"><i class="fa-solid fa-user-check"></i> Checked-In</span>`
      : `<span class="status-pill pill-checkedout"><i class="fa-solid fa-check"></i> Checked-Out</span>`;

    row.innerHTML = `
      <td><strong>${b.guestName}</strong></td>
      <td>Room ${b.roomId} <span style="color: var(--text-muted); font-size: 12px;">(${b.roomType})</span></td>
      <td>${b.checkInDate}</td>
      <td>${b.nights} night${b.nights > 1 ? "s" : ""}</td>
      <td>${statusBadge}</td>
      <td style="font-weight: 700; color: ${b.totalBill ? "#047857" : "var(--text-muted)"};">
        ${b.totalBill !== null ? "₹" + b.totalBill : "-"}
      </td>
      <td style="text-align: right;">
        ${
          isCheckedIn
            ? `<button class="btn-checkout-action" data-id="${b.id}"><i class="fa-solid fa-right-from-bracket"></i> Check Out</button>`
            : `<span style="color: var(--text-muted); font-size: 12px;">Completed</span>`
        }
        ${
          isAdmin
            ? `<button class="btn-danger-sm btn-delete-booking" data-id="${b.id}" style="margin-left: 6px;" title="Delete Booking Record"><i class="fa-solid fa-trash"></i></button>`
            : ""
        }
      </td>
    `;
    bookingsBody.appendChild(row);
  });

  // Attach Checkout Click Listeners
  document.querySelectorAll(".btn-checkout-action").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!currentUser) {
        showToast("Please login as Staff or Admin to checkout guests.", "error");
        openLoginModal();
        return;
      }
      const id = btn.getAttribute("data-id");
      try {
        const res = await fetch(`/api/bookings/${id}/checkout`, { method: "POST" });
        const data = await res.json();
        if (res.ok) {
          showToast(`Checked out ${data.guestName}! Total Bill: ₹${data.totalBill}`, "success");
          loadRooms();
          loadBookings();
        } else {
          showToast(data.error, "error");
        }
      } catch (err) {
        showToast("Checkout failed. Server communication error.", "error");
      }
    });
  });

  // Attach Delete Booking Click Listeners (Admin only)
  document.querySelectorAll(".btn-delete-booking").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const bookingId = btn.getAttribute("data-id");
      if (!confirm("Are you sure you want to delete this booking record?")) return;

      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` }
        });
        const data = await res.json();

        if (res.ok) {
          showToast("Booking record deleted.", "success");
          loadRooms();
          loadBookings();
        } else {
          showToast(data.error, "error");
        }
      } catch (err) {
        showToast("Failed to delete booking.", "error");
      }
    });
  });
}

function updateKPIs() {
  const total = allRoomsData.length;
  const avail = allRoomsData.filter((r) => r.status === "Available").length;
  const occ = allRoomsData.filter((r) => r.status === "Occupied").length;
  const activeStays = allBookingsData.filter((b) => b.status === "Checked-In").length;

  if (kpiTotalRooms) kpiTotalRooms.textContent = total;
  if (kpiAvailable) kpiAvailable.textContent = avail;
  if (kpiOccupied) kpiOccupied.textContent = occ;
  if (kpiActiveBookings) kpiActiveBookings.textContent = activeStays;
}

// Room Filter Button Handler
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeRoomFilter = btn.getAttribute("data-filter");
    renderRooms();
  });
});

// Live Search Input Listener
if (tableSearchInput) {
  tableSearchInput.addEventListener("input", renderBookingsTable);
}

// Form Submit Listener
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
    showToast("Authorization required. Please sign in to check in guests.", "error");
    openLoginModal();
    return;
  }

  const payload = {
    guestName: document.getElementById("guestName").value,
    phone: document.getElementById("phone").value,
    roomId: document.getElementById("roomId").value,
    checkInDate: document.getElementById("checkInDate").value,
    nights: document.getElementById("nights").value
  };

  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
      showToast(`Checked in ${payload.guestName} to Room ${payload.roomId}!`, "success");
      bookingForm.reset();
      if (checkInInput) checkInInput.value = new Date().toISOString().split("T")[0];
      loadRooms();
      loadBookings();
    } else {
      showToast(data.error || "Check-in failed", "error");
    }
  } catch (err) {
    showToast("Network error during check-in.", "error");
  }
});

// ---------- Initialization ----------
checkAuth();
loadRooms();
loadBookings();
