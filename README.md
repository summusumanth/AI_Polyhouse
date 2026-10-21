# Polyhouse 🌱

A control room for controlled-environment plant research: **polyhouses**,
**grow chambers** and **speed breeding** rooms report their climate from
NodeMCU sensor nodes, the server decides what the fans, coolers, misters and
irrigation should do, and **phenotyping** trials track every genotype from
sowing to harvest.

## Layout

```
Polyhouse/
├── client/     React + Vite single page app (the UI)
├── server/     Node + Express REST API on MongoDB
└── arduino/    NodeMCU / ESP8266 firmware for the sensor nodes
```

## Tech

| Part     | Stack                                                          |
| -------- | -------------------------------------------------------------- |
| Frontend | React 18, Vite, React Router, Framer Motion, Recharts, Lucide  |
| Backend  | Node.js, Express, Mongoose, JWT, bcrypt                        |
| Database | MongoDB (Docker)                                               |
| Hardware | ESP8266 NodeMCU, DHT22, soil moisture probe, relay module      |

## Getting started

You need Node.js 18+ and Docker Desktop. Run each part in its own terminal.

**1. Database**

```bash
docker compose up -d
```

MongoDB on port 27017, plus mongo-express for browsing data at
<http://localhost:8081>. Data survives restarts in the `mongo-data` volume.

**2. Server**

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

API on <http://localhost:5000>. `DB_URL` in `.env.example` already matches the
Docker container.

**3. Demo data** (optional)

```bash
cd server
npm run seed
```

Creates the area **Parlakhemundi** with seven facilities, each with a week of
readings and climate targets, and the people who work there:

| Facility | Type | What it shows |
| --- | --- | --- |
| Polyhouse A · Tomato hybrids | Polyhouse | Sun-driven daily swings, drip irrigation, a 4-line tomato trial |
| Polyhouse B · Capsicum | Polyhouse | Cooler, shaded house |
| Polyhouse C · Cucumber | Polyhouse | Thirsty crop, frequent irrigation |
| Polyhouse D · Gerbera | Polyhouse | Kept cool and dry for cut flowers |
| Polyhouse E · Nursery | Polyhouse | Humid air for seedlings |
| Grow Chamber GC-02 · Rice drought | Grow chamber | 12 h LED day, a drought treatment, tolerant vs susceptible rice |
| Speed Breeding Room SB-01 · Wheat | Speed breeding | 22 h photoperiod, generation 3 of 6, 4 wheat lines at heading |

| Person | Email | Role | Access |
| --- | --- | --- | --- |
| Super Admin | `superadmin@polyhouse.test` | Super admin | Every area |
| Sumanth | your existing account | Area admin, Parlakhemundi | Every facility in the area |
| Ramu | `ramu@polyhouse.test` | User | Polyhouse A (operate) |
| Shamitha | `shamitha@polyhouse.test` | User | Polyhouse B (operate) |
| Deepthi Sri | `deepthi.sri@polyhouse.test` | User | Polyhouse A (operate), B and C (view) |

New demo accounts start with the password defined as `DEMO_PASSWORD` in
`server/scripts/seed.js` (override it with the `SEED_PASSWORD` environment
variable). Existing accounts keep their own password.

Re-running it is safe: facilities it created keep their ids (which may be
flashed into boards) and only their readings, targets and trials are
regenerated. Your own facilities and readings are never touched.

Seeded readings stop at the moment you seed, so after an hour the facilities
show as offline. To keep them live without hardware:

```bash
cd server
npm run simulate -- --all
```

**4. Client**

```bash
cd client
npm install
npm run dev
```

UI on <http://localhost:5173>. It proxies `/api` to the server, so no extra
setup is needed in development.

**5. Accounts**

There is no public sign-up. Create the first super admin from the command line:

```bash
cd server
npm run create-super-admin -- --name "Your Name" --email you@example.com --password "a-strong-password"
```

Run it with an existing email to promote that account and reset its password,
for example if every super admin is locked out. Everyone else is added by an
admin on the **Team** page.

## Areas, roles and access

| Role | Sees | Can do |
| --- | --- | --- |
| **Super admin** | Every area | Create areas and area admins; everything below, anywhere |
| **Area admin** | Every facility in their area | Add facilities and users in their area; give each user View or Operate on specific facilities |
| **User** | Only facilities given to them | **View**: readings, charts, relays, phenotyping. **Operate**: also change targets and record observations |

Example: Sumanth is area admin of Parlakhemundi. He adds Ramu and gives him
Operate on Polyhouse A; Ramu signs in and sees only Polyhouse A.

- Every request is checked on the server against the database, so a change
  takes effect on the person's next click, not when their login expires.
- A facility someone may not see answers "not found", the same as a facility
  that does not exist.
- Rules live in one file: `server/src/lib/access.js`.
- Accounts from before roles existed are upgraded on first start: former
  admins become super admins, everyone else becomes a user with no access.

## Connecting a sensor node

The system uses **two NodeMCU boards** per facility: `arduino/sensor_node`
reads the sensors and `arduino/motor_node` switches the motors.
[arduino/README.md](arduino/README.md) walks through both, end to end. In
short: open a facility, go to **Device setup**, copy the settings block into
**both** sketches, add your WiFi details and flash. The page shows this computer's network address, since
a board cannot reach the server through `localhost`.

```
sensor_node ──POST /api/device/readings──▶ API ──▶ MongoDB
motor_node  ◀──GET /api/device/state/<id>── API  (relay decision from dashboard targets)
```

The server makes every relay decision, and both the board and the dashboard
read it, so what the dashboard shows is what the relays are doing.

## What the UI covers

- **Control room**: every facility with a live scene, current climate, relay
  activity, generation progress, and filters by facility type.
- **Facility page**
  - *Climate*: temperature, humidity, soil and CO2 against targets; 24 h and
    7 day charts; the light curve, which shows the regime at a glance (a sun
    curve, an LED square wave, or near-continuous speed breeding light);
    relay state with the reason for each.
  - *Nutrients & light* (grow chambers and speed breeding only): N, P, K and
    PPFD trends. A polyhouse measures temperature, humidity and soil moisture.
  - *Phenotyping*: growth curves per genotype for seven traits, the leading
    line, and the latest value of every trait.
  - *Device setup*: firmware settings for this facility, connection status
    and troubleshooting by error code.
  - Speed breeding rooms add a 24 h photoperiod dial and a generation tracker.
- **Speed breeding & Phenotyping**: one page for both, since breeding fast
  only pays off if you measure which lines to keep. Each speed breeding room
  shows its photoperiod dial, generation progress and leading line; below,
  every genotype from every trial (including polyhouse and grow chamber
  trials) is ranked by any of seven traits.
- Light and dark themes; works on phones.

## API

Everything except login and the device routes needs
`Authorization: Bearer <token>`. The last column is who may call it.

| Method | Route | Purpose | Who |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Sign in, returns a token | anyone |
| GET | `/api/auth/me` | Current user with role, area and access | signed in |
| PATCH | `/api/auth/password` | Change your own password | signed in |
| GET | `/api/areas` | Areas (super admin: all; others: their own) | signed in |
| POST, PATCH, DELETE | `/api/areas[/:id]` | Manage areas (delete only when empty) | super admin |
| GET | `/api/users` | People (area admin: their area) | admins |
| POST | `/api/users` | Create an account | admins |
| PATCH | `/api/users/:id` | Edit, reset password, change role or area (role/area: super admin) | admins |
| PUT | `/api/users/:id/access` | Set facility grants `[{ facility, level }]` | admins |
| DELETE | `/api/users/:id` | Remove an account | admins |
| GET | `/api/polyhouses` | Facilities you may see, each with your `permission` | signed in |
| POST | `/api/polyhouses` | Create (area admin: in their area) | admins |
| GET | `/api/polyhouses/:id` | One facility | view |
| PATCH, DELETE | `/api/polyhouses/:id` | Update or delete | manage (admins) |
| GET | `/api/polyhouses/:id/readings` | Latest raw readings (`?limit=`) | view |
| GET | `/api/polyhouses/:id/readings/series` | Averaged chart series (`?hours=24`) | view |
| GET | `/api/polyhouses/:id/readings/export` | Full history as CSV | view |
| GET | `/api/polyhouses/:id/state` | Targets, latest reading and relay decision | view |
| PUT | `/api/polyhouses/:id/threshold` | Save targets | operate |
| GET | `/api/polyhouses/:id/phenotypes` | Phenotyping observations | view |
| POST | `/api/polyhouses/:id/phenotypes` | Record an observation | operate |
| GET | `/api/phenotypes/latest` | Latest values per genotype, facilities you may see | signed in |
| GET | `/api/network` | This server's LAN addresses, for firmware setup | signed in |

Device routes need no login. They are protected by `DEVICE_KEY` when that is
set in `server/.env`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/device/readings` | Store a reading (sent by `sensor_node`) |
| GET | `/api/device/state/:id` | Relay decision (fetched by `motor_node`) |
