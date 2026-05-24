const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const path = require("path");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "autohive-secret-key-2024";

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, "data.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caller_number TEXT,
    duration INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    summary TEXT,
    transcript TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    service TEXT,
    phone TEXT,
    appointment_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT
  );
`);

const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@protechgarage.com");
if (!existingUser) {
  const hashed = bcrypt.hashSync("autohive123", 10);
  db.prepare("INSERT INTO users (email, password) VALUES (?, ?)").run("admin@protechgarage.com", hashed);
}

const existingCalls = db.prepare("SELECT COUNT(*) as count FROM calls").get();
if (existingCalls.count === 0) {
  const calls = [
    ["+15550123456", 142, "completed", "Customer asked about oil change pricing and booked an appointment."],
    ["+15559876543", 87, "completed", "Brake inspection inquiry. Customer will call back."],
    ["+15554567890", 0, "missed", ""],
    ["+15551234567", 203, "completed", "Tire rotation booked for next Monday."],
    ["+15557654321", 165, "completed", "Engine diagnostic requested. Appointment set."],
  ];
  const insertCall = db.prepare("INSERT INTO calls (caller_number, duration, status, summary) VALUES (?, ?, ?, ?)");
  calls.forEach(c => insertCall.run(...c));
}

const existingAppts = db.prepare("SELECT COUNT(*) as count FROM appointments").get();
if (existingAppts.count === 0) {
  const appts = [
    ["James Rivera", "Oil Change", "+15550123456", "2026-05-25 09:00:00"],
    ["Sarah Kim", "Brake Inspection", "+15559876543", "2026-05-25 11:00:00"],
    ["Mike Torres", "Tire Rotation", "+15554567890", "2026-05-26 10:00:00"],
    ["Lisa Chen", "Engine Diagnostic", "+15551234567", "2026-05-27 14:00:00"],
  ];
  const insertAppt = db.prepare("INSERT INTO appointments (customer_name, service, phone, appointment_time) VALUES (?, ?, ?, ?)");
  appts.forEach(a => insertAppt.run(...a));
}

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

app.get("/", (req, res) => res.json({ message: "AI Receptionist API running" }));

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, email: user.email } });
});

app.get("/auth/me", auth, (req, res) => {
  const user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

app.get("/calls", auth, (req, res) => {
  const calls = db.prepare("SELECT * FROM calls ORDER BY created_at DESC").all();
  res.json({ calls });
});

app.get("/calls/:id", auth, (req, res) => {
  const call = db.prepare("SELECT * FROM calls WHERE id = ?").get(req.params.id);
  if (!call) return res.status(404).json({ message: "Call not found" });
  res.json({ call });
});

app.get("/dashboard/appointments", auth, (req, res) => {
  const appointments = db.prepare("SELECT * FROM appointments ORDER BY appointment_time ASC").all();
  res.json({ appointments });
});

app.post("/dashboard/appointments", auth, (req, res) => {
  const { customer_name, service, phone, appointment_time } = req.body;
  const result = db.prepare(
    "INSERT INTO appointments (customer_name, service, phone, appointment_time) VALUES (?, ?, ?, ?)"
  ).run(customer_name, service, phone, appointment_time);
  res.json({ id: result.lastInsertRowid, customer_name, service, phone, appointment_time });
});

app.get("/dashboard/analytics", auth, (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const total_calls = db.prepare("SELECT COUNT(*) as count FROM calls").get().count;
  const missed_calls = db.prepare("SELECT COUNT(*) as count FROM calls WHERE status = 'missed'").get().count;
  const total_appointments = db.prepare("SELECT COUNT(*) as count FROM appointments").get().count;
  const avg_duration = db.prepare("SELECT AVG(duration) as avg FROM calls WHERE status = 'completed'").get().avg || 0;
  const daily_calls = [
    { date: "Mon", calls: 12 }, { date: "Tue", calls: 18 }, { date: "Wed", calls: 9 },
    { date: "Thu", calls: 22 }, { date: "Fri", calls: 15 }, { date: "Sat", calls: 7 }, { date: "Sun", calls: 4 },
  ];
  const appointments_booked = [
    { date: "Mon", appointments: 3 }, { date: "Tue", appointments: 6 }, { date: "Wed", appointments: 2 },
    { date: "Thu", appointments: 8 }, { date: "Fri", appointments: 5 }, { date: "Sat", appointments: 2 }, { date: "Sun", appointments: 1 },
  ];
  res.json({ total_calls, missed_calls, total_appointments, avg_duration, daily_calls, appointments_booked });
});

app.get("/dashboard/config", auth, (req, res) => {
  const rows = db.prepare("SELECT key, value FROM config").all();
  const config = {};
  rows.forEach(r => { config[r.key] = r.value; });
  if (!config.greeting) {
    config.greeting = "Thank you for calling ProTech Garage! How can I help you today?";
    config.business_name = "ProTech Garage";
    config.business_hours = "Monday to Friday, 8am to 6pm";
    config.services = "Oil changes, brake inspection, tire rotation, engine diagnostics";
    config.voicemail_enabled = "true";
    config.appointment_booking = "true";
  }
  res.json(config);
});

app.put("/dashboard/config", auth, (req, res) => {
  const upsert = db.prepare("INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?");
  Object.entries(req.body).forEach(([key, value]) => upsert.run(key, String(value), String(value)));
  res.json({ message: "Config updated" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
