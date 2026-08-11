const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOMS_FILE = path.join(__dirname, "data", "rooms.json");
const BOOKINGS_FILE = path.join(__dirname, "data", "bookings.json");
const USERS_FILE = path.join(__dirname, "data", "users.json");

// Active sessions: token -> user object
const activeSessions = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Helpers ----------
function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  return activeSessions.get(token) || null;
}

function requireAdmin(req, res, next) {
  const user = getAuthUser(req);
  if (!user || user.role !== "Administrator") {
    return res.status(403).json({ error: "Access denied. Administrator privileges required." });
  }
  req.user = user;
  next();
}

// ---------- Authentication ----------
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const users = readJSON(USERS_FILE);
  const user = users.find(
    (u) => u.username === username.toLowerCase().trim() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const userPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    avatar: user.avatar || "👤"
  };

  activeSessions.set(token, userPayload);

  res.json({
    message: "Login successful!",
    token,
    user: userPayload
  });
});

app.post("/api/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    activeSessions.delete(token);
  }
  res.json({ message: "Logged out successfully." });
});

app.get("/api/me", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user });
});

// ---------- Rooms ----------
app.get("/api/rooms", (req, res) => {
  res.json(readJSON(ROOMS_FILE));
});

// Admin Add Room
app.post("/api/rooms", requireAdmin, (req, res) => {
  const { id, type, price } = req.body;
  const roomId = Number(id);
  const roomPrice = Number(price);

  if (!roomId || !type || !roomPrice || roomPrice <= 0) {
    return res.status(400).json({ error: "Valid Room Number, Type, and Price are required." });
  }

  const rooms = readJSON(ROOMS_FILE);
  if (rooms.some((r) => r.id === roomId)) {
    return res.status(400).json({ error: `Room ${roomId} already exists.` });
  }

  const newRoom = {
    id: roomId,
    type: type.trim(),
    price: roomPrice,
    status: "Available"
  };

  rooms.push(newRoom);
  rooms.sort((a, b) => a.id - b.id);
  writeJSON(ROOMS_FILE, rooms);

  res.status(201).json(newRoom);
});

// Admin Update Room
app.put("/api/rooms/:id", requireAdmin, (req, res) => {
  const roomId = Number(req.params.id);
  const { type, price, status } = req.body;

  const rooms = readJSON(ROOMS_FILE);
  const room = rooms.find((r) => r.id === roomId);

  if (!room) return res.status(404).json({ error: "Room not found." });

  if (type) room.type = type.trim();
  if (price !== undefined) room.price = Number(price);
  if (status && ["Available", "Occupied", "Maintenance"].includes(status)) {
    room.status = status;
  }

  writeJSON(ROOMS_FILE, rooms);
  res.json(room);
});

// Admin Delete Room
app.delete("/api/rooms/:id", requireAdmin, (req, res) => {
  const roomId = Number(req.params.id);
  let rooms = readJSON(ROOMS_FILE);
  const room = rooms.find((r) => r.id === roomId);

  if (!room) return res.status(404).json({ error: "Room not found." });
  if (room.status === "Occupied") {
    return res.status(400).json({ error: `Cannot delete Room ${roomId} while it is Occupied.` });
  }

  rooms = rooms.filter((r) => r.id !== roomId);
  writeJSON(ROOMS_FILE, rooms);
  res.json({ message: `Room ${roomId} deleted successfully.` });
});

// ---------- User / Staff Management (Admin Only) ----------
app.get("/api/users", requireAdmin, (req, res) => {
  const users = readJSON(USERS_FILE).map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    avatar: u.avatar || "👤"
  }));
  res.json(users);
});

app.post("/api/users", requireAdmin, (req, res) => {
  const { username, password, name, role, avatar } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: "Username, Password, Name, and Role are required." });
  }

  const users = readJSON(USERS_FILE);
  const cleanUsername = username.toLowerCase().trim();

  if (users.some((u) => u.username === cleanUsername)) {
    return res.status(400).json({ error: `Username "${cleanUsername}" is already taken.` });
  }

  const newUser = {
    id: Date.now(),
    username: cleanUsername,
    password,
    name: name.trim(),
    role: role === "Administrator" ? "Administrator" : "Front Desk Staff",
    avatar: avatar || (role === "Administrator" ? "👨‍💼" : "👩‍💻")
  };

  users.push(newUser);
  writeJSON(USERS_FILE, users);

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    name: newUser.name,
    role: newUser.role,
    avatar: newUser.avatar
  });
});

app.delete("/api/users/:id", requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  if (userId === req.user.id) {
    return res.status(400).json({ error: "You cannot delete your own active administrator account." });
  }

  let users = readJSON(USERS_FILE);
  const targetUser = users.find((u) => u.id === userId);

  if (!targetUser) return res.status(404).json({ error: "User account not found." });

  users = users.filter((u) => u.id !== userId);
  writeJSON(USERS_FILE, users);

  res.json({ message: `Account "${targetUser.username}" removed successfully.` });
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

// Admin Delete Booking
app.delete("/api/bookings/:id", requireAdmin, (req, res) => {
  const bookingId = Number(req.params.id);
  let bookings = readJSON(BOOKINGS_FILE);
  const rooms = readJSON(ROOMS_FILE);

  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return res.status(404).json({ error: "Booking not found." });

  // If active booking, free up the room
  if (booking.status === "Checked-In") {
    const room = rooms.find((r) => r.id === booking.roomId);
    if (room) room.status = "Available";
    writeJSON(ROOMS_FILE, rooms);
  }

  bookings = bookings.filter((b) => b.id !== bookingId);
  writeJSON(BOOKINGS_FILE, bookings);

  res.json({ message: "Booking record deleted successfully." });
});

app.listen(PORT, () => {
  console.log(`Hotel Management System running at http://localhost:${PORT}`);
});
