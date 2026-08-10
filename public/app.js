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

let currentUser = null;
let authToken = localStorage.getItem("hotel_auth_token") || null;

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
  if (currentUser) {
    headerUser.innerHTML = `
      <div class="user-badge-container">
        <span class="user-avatar">${currentUser.avatar}</span>
        <div class="user-info">
          <span class="user-name">${currentUser.name}</span>
          <span class="user-role">${currentUser.role}</span>
        </div>
      </div>
      <button id="btn-logout" class="btn-header-action btn-logout">Logout</button>
    `;
    document.getElementById("btn-logout").addEventListener("click", performLogout);
    closeLoginModal();
  } else {
    headerUser.innerHTML = `
      <button id="btn-open-login" class="btn-header-action btn-login">Login</button>
    `;
    document.getElementById("btn-open-login").addEventListener("click", openLoginModal);
  }
}

function openLoginModal() {
  loginError.textContent = "";
  loginModal.classList.remove("hidden");
}

function closeLoginModal() {
  loginModal.classList.add("hidden");
}

async function performLogin(username, password) {
  loginError.textContent = "";
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
      loadRooms();
      loadBookings();
    } else {
      loginError.textContent = data.error || "Login failed.";
    }
  } catch (err) {
    loginError.textContent = "Network error while logging in.";
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
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  await performLogin(username, password);
});

btnDemoAdmin.addEventListener("click", () => {
  document.getElementById("login-username").value = "admin";
  document.getElementById("login-password").value = "admin123";
  performLogin("admin", "admin123");
});

btnDemoStaff.addEventListener("click", () => {
  document.getElementById("login-username").value = "staff";
  document.getElementById("login-password").value = "staff123";
  performLogin("staff", "staff123");
});

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

// ---------- Data Loaders ----------
async function loadRooms() {
  const res = await fetch("/api/rooms");
  const rooms = await res.json();

  roomsGrid.innerHTML = "";
  roomSelect.innerHTML = "";

  rooms.forEach((room) => {
    const tile = document.createElement("div");
    tile.className = `room-tile ${room.status === "Available" ? "available" : "occupied"}`;
    tile.innerHTML = `Room ${room.id}<small>${room.type} · ₹${room.price}/night</small><small>${room.status}</small>`;
    roomsGrid.appendChild(tile);

    if (room.status === "Available") {
      const opt = document.createElement("option");
      opt.value = room.id;
      opt.textContent = `Room ${room.id} - ${room.type} (₹${room.price}/night)`;
      roomSelect.appendChild(opt);
    }
  });

  if (roomSelect.options.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "No rooms available";
    opt.disabled = true;
    roomSelect.appendChild(opt);
  }
}

async function loadBookings() {
  const res = await fetch("/api/bookings");
  const bookings = await res.json();

  bookingsBody.innerHTML = "";

  bookings
    .slice()
    .reverse()
    .forEach((b) => {
      const row = document.createElement("tr");
      const statusClass = b.status === "Checked-In" ? "status-checkedin" : "status-checkedout";
      row.innerHTML = `
        <td>${b.guestName}</td>
        <td>${b.roomId} (${b.roomType})</td>
        <td>${b.checkInDate}</td>
        <td>${b.nights}</td>
        <td class="${statusClass}">${b.status}</td>
        <td>${b.totalBill !== null ? "₹" + b.totalBill : "-"}</td>
        <td>${
          b.status === "Checked-In"
            ? `<button class="btn-checkout" data-id="${b.id}">Check Out</button>`
            : "-"
        }</td>
      `;
      bookingsBody.appendChild(row);
    });

  document.querySelectorAll(".btn-checkout").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!currentUser) {
        openLoginModal();
        return;
      }
      const id = btn.getAttribute("data-id");
      const res = await fetch(`/api/bookings/${id}/checkout`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`Checked out. Total bill: ₹${data.totalBill}`);
        loadRooms();
        loadBookings();
      } else {
        alert(data.error);
      }
    });
  });
}

bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
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

  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (res.ok) {
    bookingMsg.textContent = `✅ ${payload.guestName} checked in to Room ${payload.roomId}.`;
    bookingMsg.style.color = "#2e7d32";
    bookingForm.reset();
    loadRooms();
    loadBookings();
  } else {
    bookingMsg.textContent = `❌ ${data.error}`;
    bookingMsg.style.color = "#c62828";
  }
});

// ---------- Initialization ----------
checkAuth();
loadRooms();
loadBookings();

