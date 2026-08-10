const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOMS_FILE = path.join(__dirname, "data", "rooms.json");
const BOOKINGS_FILE = path.join(__dirname, "data", "bookings.json");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Helpers ----------
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- Rooms ----------
app.get("/api/rooms", (req, res) => {
  res.json(readJSON(ROOMS_FILE));
});

// ---------- Bookings ----------
app.get("/api/bookings", (req, res) => {
  res.json(readJSON(BOOKINGS_FILE));
});

// Create a booking (check-in)
app.post("/api/bookings", (req, res) => {
  const { guestName, phone, roomId, checkInDate, nights } = req.body;

  if (!guestName || !roomId || !checkInDate || !nights) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const rooms = readJSON(ROOMS_FILE);
  const room = rooms.find((r) => r.id === Number(roomId));

  if (!room) return res.status(404).json({ error: "Room not found." });
  if (room.status !== "Available") {
    return res.status(400).json({ error: "Room is not available." });
  }

  const bookings = readJSON(BOOKINGS_FILE);
  const newBooking = {
    id: Date.now(),
    guestName,
    phone: phone || "",
    roomId: room.id,
    roomType: room.type,
    pricePerNight: room.price,
    checkInDate,
    nights: Number(nights),
    status: "Checked-In",
    totalBill: null,
    checkOutDate: null
  };

  bookings.push(newBooking);
  room.status = "Occupied";

  writeJSON(BOOKINGS_FILE, bookings);
  writeJSON(ROOMS_FILE, rooms);

  res.status(201).json(newBooking);
});

// Checkout a booking
app.post("/api/bookings/:id/checkout", (req, res) => {
  const bookingId = Number(req.params.id);
  const bookings = readJSON(BOOKINGS_FILE);
  const rooms = readJSON(ROOMS_FILE);

  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  if (booking.status === "Checked-Out") {
    return res.status(400).json({ error: "Booking already checked out." });
  }

  booking.status = "Checked-Out";
  booking.checkOutDate = new Date().toISOString().split("T")[0];
  booking.totalBill = booking.nights * booking.pricePerNight;

  const room = rooms.find((r) => r.id === booking.roomId);
  if (room) room.status = "Available";

  writeJSON(BOOKINGS_FILE, bookings);
  writeJSON(ROOMS_FILE, rooms);

  res.json(booking);
});

app.listen(PORT, () => {
  console.log(`Hotel Management System running at http://localhost:${PORT}`);
});
