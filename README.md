# Hotel Management System

A simple hotel management web app built with **Node.js + Express** (backend) and **HTML/CSS/JavaScript** (frontend).

## Features
- View all rooms with live status (Available / Occupied)
- Check in a guest (create a booking) with name, phone, room, check-in date, and number of nights
- View active and past bookings
- Check out a guest — automatically calculates the total bill and frees the room

## Tech Stack
- Backend: Node.js, Express
- Data storage: JSON files (`data/rooms.json`, `data/bookings.json`) — no database setup needed
- Frontend: Vanilla HTML/CSS/JS (no framework, no build step)

## Project Structure
```
hotel-management/
├── data/
│   ├── rooms.json
│   └── bookings.json
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js
├── package.json
└── README.md
```

## Run Locally
```bash
npm install
npm start
```
Then open http://localhost:3000 in your browser.

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/rooms | List all rooms and status |
| GET | /api/bookings | List all bookings |
| POST | /api/bookings | Create a booking (check-in) |
| POST | /api/bookings/:id/checkout | Check out a booking, calculate bill |

## License
MIT
