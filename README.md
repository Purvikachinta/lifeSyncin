# LifeSync — Real-Time Blood Donation Platform

A full-stack blood donation coordination platform with real-time emergency
dispatch and routine scheduling.

## Tech Stack
- **Backend:** Node.js + Express.js
- **Frontend:** EJS (server-side rendered) + Tailwind CSS (via CDN) — no React
- **Database:** SQLite via Node's built-in `node:sqlite` module (no native
  compilation required — swap in `better-sqlite3` or Prisma if you prefer,
  the `db.js` wrapper exposes the same `.prepare().run()/.get()/.all()` API)
- **Real-time:** Socket.io for the staggered emergency dispatch engine

## Setup

```bash
npm install
npm run seed     # populates 4 mock donors, 1 hospital, 1 blood bank
npm start         # http://localhost:3000
```

Node 22+ is required (uses the built-in experimental `node:sqlite` module).

## Demo accounts (after seeding)

| Role     | Email                    | Password     |
|----------|--------------------------|--------------|
| Donor    | ananya@example.com       | password123  |
| Donor    | karthik@example.com      | password123  |
| Donor    | priya@example.com        | password123  |
| Donor (in cooldown) | rahul@example.com | password123  |
| Hospital | kgh@example.com          | hospital123  |
| Blood Bank | redcross@example.com   | bank123      |

All 4 seeded donors share blood group **O+** at staggered distances
(2.3km, 3.5km, 5.8km, 8.1km) so you can watch the cascading dispatch loop
move from the closest donor outward. Rahul (3.5km) is seeded with a
donation 30 days ago, so the 90-day male cooldown filter excludes him from
the queue even though he's the second-closest — open two flows (hospital +
donor) to see it skip straight to Karthik after Ananya.

## Testing the cascading dispatch engine

1. Log in as the hospital (`kgh@example.com` / `hospital123`) in one browser tab.
2. Log in as a donor (e.g. `ananya@example.com` / `password123`) in another
   tab/incognito window.
3. From the hospital dashboard, broadcast a new **Emergency SOS** request
   for blood group **O+**.
4. Watch the donor tab: a full-screen modal pings Ananya (closest, 2.3km)
   with a live 10-second countdown bar.
5. If not accepted within 10 seconds, the ping automatically cancels and
   cascades to the next closest eligible donor (Karthik, 5.8km — Rahul is
   skipped due to cooldown).
6. Whoever clicks **Accept** first instantly claims the request; the
   hospital's live dispatch log updates in real time, and the alert is
   dismissed for all other donors simultaneously (no race conditions).

## Project structure

```
lifesync/
├── server.js              # Express + Socket.io entry point
├── db.js                  # SQLite connection + schema (node:sqlite)
├── prisma/seed.js         # Mock data seeder (kept in /prisma for naming
│                           # continuity; not actual Prisma — see db.js)
├── routes/
│   ├── main.js             # / and /select-role
│   ├── donor.js            # donor registration (eligibility-gated), login, dashboard
│   ├── hospital.js         # hospital registration, login, dashboard, SOS broadcast
│   └── bank.js              # blood bank registration, login, dashboard, slots/bookings
├── sockets/
│   └── dispatchEngine.js   # the 10-second cascading dispatch queue logic
├── utils/
│   └── eligibility.js      # medical eligibility + cooldown gates
└── views/                  # EJS templates styled with Tailwind CSS (CDN)
    ├── partials/           # shared head + navbar
    ├── donor/
    ├── hospital/
    └── bank/
```

## Business logic notes

- **Donor eligibility gate:** age must be 18–65 AND none of the four
  high-risk health checkboxes (asthma, recent tattoo/piercing, active
  medications, chronic conditions) may be checked. If the gate fails, no
  database row is created — the user sees a dedicated ineligibility page
  with safety guidelines instead.
- **Cooldown filter:** donors are excluded from emergency dispatch if their
  `lastDonationDate` is within 90 days (male) / 120 days (female) of now.
- **Distance radius:** mock distances are stored per-donor (or randomly
  generated at registration); only donors within 10km are queued.
- **Claim race-condition safety:** accepting a request performs a
  conditional `UPDATE ... WHERE status = 'ACTIVE'` — only the first
  successful writer wins, and the pending cascade timer is cleared
  immediately server-side.
