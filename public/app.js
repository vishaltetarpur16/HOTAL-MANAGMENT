const roomsGrid = document.getElementById("rooms-grid");
const roomSelect = document.getElementById("roomId");
const bookingForm = document.getElementById("booking-form");
const bookingMsg = document.getElementById("booking-msg");
const bookingsBody = document.getElementById("bookings-body");

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

loadRooms();
loadBookings();
