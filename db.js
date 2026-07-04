const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'lifesync.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS donors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  age INTEGER NOT NULL,
  bloodGroup TEXT NOT NULL,
  gender TEXT NOT NULL,
  location TEXT NOT NULL,
  distanceKm REAL DEFAULT 5,
  lastDonationDate TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  location TEXT NOT NULL,
  regNumber TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blood_banks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  location TEXT NOT NULL,
  licenseNumber TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,              -- 'SOS' or 'ROUTINE'
  bloodGroup TEXT NOT NULL,
  unitsNeeded INTEGER DEFAULT 1,
  hospitalId INTEGER,
  hospitalName TEXT,
  location TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'ACTIVE',    -- ACTIVE, CLAIMED, EXPIRED
  claimedByDonorId INTEGER,
  claimedByDonorName TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospitalId) REFERENCES hospitals(id)
);

CREATE TABLE IF NOT EXISTS dispatch_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  postId INTEGER NOT NULL,
  donorId INTEGER NOT NULL,
  donorName TEXT,
  distanceKm REAL,
  status TEXT DEFAULT 'PINGED',   -- PINGED, TIMEOUT, ACCEPTED, SKIPPED
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (postId) REFERENCES posts(id)
);

CREATE TABLE IF NOT EXISTS bank_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bankId INTEGER,
  bankName TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  capacity INTEGER DEFAULT 5,
  bookedCount INTEGER DEFAULT 0,
  FOREIGN KEY (bankId) REFERENCES blood_banks(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slotId INTEGER NOT NULL,
  donorId INTEGER,
  donorName TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (slotId) REFERENCES bank_slots(id)
);
`);

module.exports = db;
