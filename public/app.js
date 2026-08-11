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

// KPI & Extra UI Elements
const kpiTotalRooms = document.getElementById("kpi-total-rooms");
const kpiAvailable = document.getElementById("kpi-available");
const kpiOccupied = document.getElementById("kpi-occupied");
const kpiActiveBookings = document.getElementById("kpi-active-bookings");
const liveClock = document.getElementById("live-clock");
const tableSearchInput = document.getElementById("table-search-input");
const toastContainer = document.getElementById("toast-container");
const filterBtns = document.querySelectorAll(".filter-btn");

let currentUser = null;
let authToken = localStorage.getItem("hotel_auth_token") || null;
let allRoomsData = [];
let allBookingsData = [];
let activeRoomFilter = "all";

// ---------- Live Clock ----------
function updateClock() {
  if (!liveClock) return;
  const now = new Date();
  liveClock.textContent = now.toLocaleTimeString();
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
  toast.className = `toast-3d toast-${type}`;
  const icon = type === "success" ? "fa-circle-check text-green" : "fa-triangle-exclamation text-rose";
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
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
    headerUser.innerHTML = `
      <div class="user-badge-3d">
        <span class="user-avatar-3d">${currentUser.avatar}</span>
        <div class="user-info-3d">
          <span class="user-name-3d">${currentUser.name}</span>
          <span class="user-role-3d">${currentUser.role}</span>
        </div>
      </div>
      <button id="btn-logout" class="btn-3d btn-logout-3d"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
    `;
    document.getElementById("btn-logout").addEventListener("click", performLogout);
    closeLoginModal();
  } else {
    headerUser.innerHTML = `
      <button id="btn-open-login" class="btn-3d btn-login-3d"><i class="fa-solid fa-user-lock"></i> Staff Login</button>
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

// ---------- 3D Tilt Micro-interactions ----------
function attach3DTiltEffects() {
  const cards = document.querySelectorAll(".room-card-3d, .kpi-card, .tilt-element");
  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
      card.style.transition = "transform 0.5s ease";
    });

    card.addEventListener("mouseenter", () => {
      card.style.transition = "none";
    });
  });
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
    tile.className = `room-card-3d ${isAvail ? "available" : "occupied"}`;
    tile.innerHTML = `
      <div class="room-header-3d">
        <span class="room-number-3d"><i class="fa-solid fa-bed"></i> Room ${room.id}</span>
        <span class="room-status-dot"></span>
      </div>
      <div class="room-type-3d">${room.type} Class</div>
      <div class="room-price-3d">₹${room.price} <small>/ night</small></div>
      <div class="room-badge-3d">${room.status}</div>
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

  attach3DTiltEffects();
}

async function loadBookings() {
  try {
    const res = await fetch("/api/bookings");
    allBookingsData = await res.json();
    renderBookingsTable();
    updateKPIs();
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

  filtered.forEach((b) => {
    const row = document.createElement("tr");
    const isCheckedIn = b.status === "Checked-In";
    const statusBadge = isCheckedIn
      ? `<span class="badge-status badge-checkedin"><i class="fa-solid fa-user-check"></i> Checked-In</span>`
      : `<span class="badge-status badge-checkedout"><i class="fa-solid fa-flag-checkered"></i> Checked-Out</span>`;

    row.innerHTML = `
      <td>${b.guestName}</td>
      <td><strong>Room ${b.roomId}</strong> <small style="color: var(--text-muted);">(${b.roomType})</small></td>
      <td>${b.checkInDate}</td>
      <td>${b.nights} night${b.nights > 1 ? "s" : ""}</td>
      <td>${statusBadge}</td>
      <td style="font-weight: 700; color: ${b.totalBill ? "#34d399" : "var(--text-muted)"};">
        ${b.totalBill !== null ? "₹" + b.totalBill : "-"}
      </td>
      <td>${
        isCheckedIn
          ? `<button class="btn-checkout-3d" data-id="${b.id}"><i class="fa-solid fa-right-from-bracket"></i> Check Out</button>`
          : `<span style="color: var(--text-subtle); font-size: 12px;">Completed</span>`
      }</td>
    `;
    bookingsBody.appendChild(row);
  });

  // Attach Checkout Click Listeners
  document.querySelectorAll(".btn-checkout-3d").forEach((btn) => {
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
attach3DTiltEffects();
