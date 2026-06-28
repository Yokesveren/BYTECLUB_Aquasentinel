<div align="center">

# 🌊 AQUA-SENTINEL

### Real-Time Maritime Emergency Response System

**Built by Team BYTECLUB · Coastal Innovation Hackathon 2025**
**Track: Smart & Sustainable Cities**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_App-00d4aa?style=for-the-badge)](https://byteclub-aquasentinel.vercel.app/dashboard)
[![GitHub](https://img.shields.io/badge/GitHub-BYTECLUB__Aquasentinel-1a2d45?style=for-the-badge&logo=github)](https://github.com/Yokesveren/BYTECLUB_Aquasentinel)
[![TypeScript](https://img.shields.io/badge/TypeScript-98%25-378add?style=for-the-badge&logo=typescript)](https://github.com/Yokesveren/BYTECLUB_Aquasentinel)

---

*"Every year, thousands of fishermen disappear at sea — not because rescue was impossible, but because the distress signal never arrived."*

</div>

---

## 🎯 The Problem

Over **70% of fishing-related maritime fatalities** in developing coastal regions occur because distress signals either never reach shore authorities or arrive too late. Existing solutions like EPIRB cost **₹40,000+ per vessel**, require internet connectivity, and are completely out of reach for small-scale fishermen.

India alone has **12+ million small-scale fishermen** — most operating with no emergency communication infrastructure whatsoever.

---

## 💡 Our Solution

AQUA-SENTINEL is a **full-stack maritime emergency response platform** that combines a decentralised peer-to-peer LoRa mesh network with a real-time web operations dashboard. It delivers coast guard-grade distress response capability at **₹2,500–3,500 per vessel** — a 10× cost reduction — with **zero internet dependency**.

Each vessel carries a low-cost hardware node. These nodes form a self-healing wireless mesh across the ocean. When a vessel capsizes or a fisherman presses SOS, the distress signal hops through the mesh relay-by-relay until it reaches the shore gateway, which triggers the full rescue chain — drone dispatch, coast guard alert, and nearest-vessel mutual aid — in seconds.

```
Distressed Vessel (100 km offshore)
        ↓  LoRa hop ~25 km
  Buoy Relay Node   (anchored ocean buoy)
        ↓  LoRa hop ~25 km
  Vessel Relay      (nearby fishing boat acting as dynamic relay)
        ↓  LoRa hop ~25 km
  Shore Buoy / Jetty Node
        ↓
  Elevated Shore Gateway  (Yagi antenna, covers 40–60 km)
        ↓
  AQUA-SENTINEL Dashboard  →  Drone  +  Coast Guard  +  Nearest Vessels
```

**Total coverage: 100 km offshore with 4 hops.**

---

## 🖥️ Web Dashboard — Features

> The operations dashboard is the command brain of the system. Here's every page and what it does.

---

### 📊 Dashboard — Command Overview

The first page a rescue operator sees. Shows the live health of the entire network at a glance.

- **6 live stat cards** — vessels monitored, active nodes, distress alerts (pulses red when active), drones deployed, network uptime %, messages relayed today. All numbers animate with a count-up effect on load.
- **Sparkline charts** on each card showing the last 7 readings
- **Recent distress alerts feed** — last 10 alerts with vessel ID, type badge, timestamp, and status pill
- **Node health panel** — per-node animated status dots (online / degraded / offline) with signal strength bars
- **Drone fleet status** — DR-01 and DR-02 cards with battery bars and mission progress
- **24-hour network activity area chart** — messages relayed per hour with teal gradient fill
- **System status banner** — "ALL SYSTEMS NOMINAL" in teal or "ALERT ACTIVE" blinking in red

---

### 🗺️ Live Map — Vessel Tracking

Full-screen Leaflet map with dark CartoDB tiles — looks like a genuine naval AIS display.

- **Custom ship-shaped SVG markers** that rotate to match each vessel's real-time heading
- **Color coded by status** — blue (normal), amber (low signal), red (distress)
- **Fading wake trails** — last 8 positions drawn as dashed polylines behind each vessel
- **Vessels move smoothly** every 2 seconds via Socket.io live position updates
- **Click any vessel marker** to open a popup with: speed (knots), heading (°), GPS coordinates, owner, home port, battery, assigned node ID
- **Popup actions** — Track vessel (centres and follows on map), View history (draws last 50 positions), Send alert (manual welfare check)
- **Shore gateway nodes** — pulsing teal diamond markers with animated ring
- **Relay buoy nodes** — square markers with hover tooltip
- **Distress vessels** — animated pulsing red ring + dashed line showing hop-by-hop path to shore
- **Drone flight path** — animated dashed amber line from shore to target when drone is deployed
- **Filter toggles** — show/hide vessels, buoys, gateways, and trails independently
- **"Fit all vessels"** button — auto-zooms to show the entire tracked fleet

---

### 🌍 Globe View — Global Node Atlas

Interactive 3D Earth built with raw Three.js WebGL.

- **Real Earth textures** — dark earth map, topology bump map, specular water map for accurate geography
- **Atmospheric glow** — subtle blue limb glow just like seen from orbit
- **Directional sun lighting** — one side illuminated, one dark, just like real Earth
- **Auto-rotation** at a slow constant speed — pauses when you interact, resumes after 3 seconds
- **47 nodes plotted** across India, Bangladesh, Sri Lanka, Indonesia, Philippines, Vietnam, Thailand, Nigeria, Ghana, Kenya, Tanzania, Portugal, Spain, Greece, Norway, Brazil, Mexico, USA, Japan, and Australia
- **Node colors** — blue (shore gateway), teal (buoy relay), amber (vessel node), red with glow (active alert)
- **Alert nodes emit a red PointLight** — visible as a glowing halo on the globe surface
- **Hover** any node → floating HTML tooltip with name, type, status, coordinates
- **Click** any node → camera smoothly flies to that region
- **Drag to rotate** (mouse and touch), **scroll to zoom** (clamped 2.5×–8×)
- **Filter buttons** — All / Shore Gateways / Buoy Relays / Vessel Nodes / Active Alerts
- **"Locate India"** button — flies camera to Bay of Bengal cluster where most nodes are

---

### 🚨 Distress Feed — Live Alert Management

The page rescue coordinators monitor continuously.

**Each alert card shows:**
- Vessel ID in bold monospace
- Alert type badge — `CAPSIZE DETECTED` / `MANUAL SOS` / `WELFARE CHECK`
- GPS coordinates of the event
- Relative timestamp ("2 min ago")
- Hop count — how many mesh relays the signal traveled
- 3-step status stepper — **SIGNAL RECEIVED → DRONE DISPATCHED → RESCUE EN ROUTE**
- New cards slide in from the top with stagger animation

**Refresh button** — fetches a new randomised set of alerts from the database. Old cards exit left, new ones enter from the right.

**Acknowledge button** — when clicked, the action buttons are replaced with two information badges:

| Badge | Values |
|---|---|
| **Critical Level** | `CRITICAL` (capsize) · `HIGH` (manual SOS) · `MEDIUM` (welfare check) |
| **Signal Origin** | `AUTO-SENSOR — MPU6050 Capsize Detection` · `PHYSICAL SOS BUTTON — Manual Press` · `DEAD MAN SWITCH — Automated Welfare Protocol` |

The card border fades to neutral, confirming the alert has been reviewed.

**Right statistics panel:**
- Today's metrics: total alerts, average response time, false positives caught, successful rescues
- Donut chart — breakdown of alert types
- Bar chart — alerts by hour over last 24 hours
- Scrollable activity log in monospace

---

### 🚢 Fleet Manager — Vessel CRUD + Radar

Split-view page combining a live radar map (top 58%) and a full data table (bottom 42%).

**Radar map:**
- Same live vessel tracking as Live Map but embedded inline within the page
- Clicking a ship icon opens an info card popup
- "Track" locks the map to follow that vessel; "Send Alert" creates a welfare check
- Table row clicks → map flies to that vessel and highlights it
- Map marker clicks → corresponding table row glows with teal border for 2 seconds

**Vessel table — full CRUD:**
- Columns: Vessel ID, Name, Type, Assigned Node, Owner, Position, Status, Speed, Battery, Actions
- Sort by any column (click header to toggle asc/desc)
- Filter by type (All / Fishing / Commute / Security) and status
- Search bar filters by vessel ID or name in real time
- Pagination — 10 vessels per page

**Add / Edit vessel modal:**
- Fields: Vessel ID, Name, Type, Owner Name, Home Port, Assigned Node ID, GPS coordinates, Notes
- Full validation — missing required fields highlighted on submit
- Submits to REST API, table refreshes immediately

**Delete vessel:** confirmation dialog before the DELETE call.

---

### 🚁 Drone Control — Fleet Management + Dispatch

Two large drone status cards for DR-01 and DR-02:
- Status badge: `STANDBY` / `DEPLOYED` / `RETURNING` / `MAINTENANCE`
- Battery bar (green >60%, amber 20–60%, red <20%)
- Animated mission progress bar with live ETA countdown
- Target vessel ID and coordinates when on a mission
- Last 5 missions: timestamp, target vessel, outcome

**Deploy to distress flow:**
1. Click "Deploy to distress"
2. List of active distress alerts appears — select a vessel, confirm
3. `POST /api/drones/:id/deploy` updates the database and broadcasts via Socket.io
4. **Canvas flight animation plays:**
   - A quadcopter drone shape fades in at the bottom of the screen
   - Flies along a bezier curve toward the target vessel's screen position
   - Motion blur trail follows behind the drone
   - ETA countdown displayed in the corner
   - On arrival: three expanding red pulse rings appear, "DRONE ON SITE" shown in teal
   - Canvas fades out, drone card transitions to DEPLOYED state

Mission history table — all past missions sortable by drone, target, time, and outcome.

---

### 📡 Node Network — Mesh Topology + 3D Inspector

**Force-directed network graph** (Canvas 2D):
- Shore gateways as large blue circles, buoy relays as teal squares, vessel nodes as amber circles
- Edges between nodes within 25 km range — thickness = signal strength
- Animated data packets travel along edges showing live mesh traffic
- Clicking a node highlights all its direct connections

**Clicking any node row opens the 3D Node Inspector** — a full-screen modal with a live Three.js scene on the left and node data on the right.

*What the 3D scene renders per node type:*

**Buoy node:**
- Orange HDPE float cylinder bobbing at the waterline (sine-wave animation)
- Solar panel with blue emissive glow on top, LoRa antenna with dish
- Mooring chain of torus links descending below the waterline
- Animated wave plane below the buoy
- Spray particle system near the waterline

**Shore node:**
- Concrete base, communication tower, equipment box with teal emissive glow
- Antenna array, lighthouse beacon with animated blink

**Vessel node:**
- Extruded ship hull, navigation mast, red/green port/starboard lights
- Wake particle system trailing behind

**All node types share:**
- 3 LoRa signal rings expanding outward — color matches status (teal=online, red=alert)
- Ocean fog atmosphere (`FogExp2`)
- Full OrbitControls — drag to inspect the node from any angle

*Right panel data sections (collapsible):*
- Hardware Status: signal strength bar, battery bar, uptime ring, last ping, firmware version
- Connectivity: neighbour nodes, hop count to shore, packet success rate
- Location: coordinates, installation depth (buoys), installation date, region
- Recent Activity: last 5 messages relayed, alert history for this node

*Action buttons:* Ping node (shows latency ms) · View on map · Edit node

---

### ⚙️ Settings — System Configuration

Persistent settings stored in the database, pre-filled on page load, auto-saved on change.

| Section | Controls |
|---|---|
| General | Timezone, language, dark mode |
| Alert Thresholds | MPU6050 capsize sensitivity, welfare check timeout, auto-drone dispatch toggle, false-positive cancel window |
| Network Config | LoRa frequency, hop limit (1–10), GPS broadcast interval, node offline threshold |
| Notifications | Email / SMS / push / sound toggles, recipient email |
| API Keys | Masked display with show/hide toggle |
| About | App version, hackathon info, team details |

---

## ⚙️ Technical Stack

### Frontend
| | Technology |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS (fully custom dark theme) |
| Animation | Framer Motion |
| 3D Globe + Node Inspector | Three.js (raw WebGL) |
| Live Map + Fleet Radar | Leaflet.js + React Leaflet |
| Charts | Recharts |
| Global State | Zustand |
| Real-time | Socket.io client |

### Backend
| | Technology |
|---|---|
| Server | Node.js + Express + TypeScript |
| Real-time | Socket.io |
| Database | SQLite via better-sqlite3 |
| Simulation | Continuous vessel movement + auto-distress engine |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│         (Vite · TypeScript · Tailwind · Zustand)         │
└──────────────────┬───────────────┬──────────────────────┘
                   │  REST API     │  WebSocket
                   │  (Axios)      │  (Socket.io)
┌──────────────────▼───────────────▼──────────────────────┐
│                  Express Backend                          │
│              (Node.js · TypeScript)                      │
│                                                          │
│   ┌──────────────────┐    ┌──────────────────────────┐  │
│   │  Simulation Loop  │    │     Socket.io Server     │  │
│   │  vessel movement  │───▶│  vessel:update           │  │
│   │  auto-alerts      │    │  alert:new               │  │
│   │  drone missions   │    │  drone:update            │  │
│   └──────────────────┘    │  node:status-change      │  │
│                            └──────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │    SQLite Database      │
          │  vessels · nodes        │
          │  alerts · drones        │
          │  drone_missions         │
          │  vessel_positions       │
          │  network_activity       │
          │  settings               │
          └─────────────────────────┘
```

---

## 🔁 Simulation Engine

The backend runs a continuous simulation engine from startup with no external hardware needed:

| Interval | Action |
|---|---|
| Every 2 s | All vessels move (heading drift ±3°, bounce at Bay of Bengal boundaries). `vessel:update` emitted to all clients. |
| Every 15–20 s | Random vessel triggers a distress alert (60% capsize, 40% manual SOS). `alert:new` emitted. |
| +8 s after alert | Drone auto-assigned. Alert status → `drone_dispatched`. `drone:update` emitted. |
| +25 s after dispatch | Alert status → `rescue_en_route`. |
| Every 2 min | One random node degrades for 30 s, then recovers. `node:status-change` emitted. |
| Every 1 hr | New `network_activity` row inserted. Dashboard charts update. |

---

## 🚀 Local Setup

### Prerequisites
- Node.js v18 or higher
- npm

### Install and run

```bash
# 1. Clone the repository
git clone https://github.com/Yokesveren/BYTECLUB_Aquasentinel.git
cd BYTECLUB_Aquasentinel

# 2. Install all dependencies (root + client + server)
npm run install:all

# 3. Start both frontend and backend together
npm run dev
```

| Service | URL |
|---|---|
| Frontend Dashboard | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Socket.io | http://localhost:3001 |

The SQLite database is created and seeded automatically on first run. No `.env` file required.

### Seed data (auto-loaded on first run)
- 10 vessels in the Bay of Bengal (fishing + commute mix)
- 47 relay nodes across India, SE Asia, Africa, Europe, Americas, Australia
- 2 drones (DR-01, DR-02)
- 15 historical alerts at various stages
- 24 hours of network activity data

---

## ☁️ Deployment

### Backend — Render 
- Root directory: `server`
- Build: `npm install && npm run build`
- Start: `node dist/index.js`

### Frontend — Vercel
- Framework: Vite
- Root directory: `client`
- Build: `npm run build`
- Output: `dist`
- Environment variables:
  ```
  VITE_API_URL=https://your-backend.onrender.com/api
  VITE_SOCKET_URL=https://your-backend.onrender.com
  ```

---

## 📡 Hardware Specification

> The physical node each vessel carries. The web dashboard is the operations center for this hardware network.

| Component | Part | Estimated Cost |
|---|---|---|
| Microcontroller | ESP32 | ₹350 |
| LoRa radio | SX1278 — 915 MHz, 25 km range | ₹450 |
| IMU (capsize detection) | MPU6050 | ₹120 |
| GPS module | NEO-6M | ₹280 |
| Display | 0.96" OLED | ₹150 |
| Power | 5W solar panel + 10,000 mAh LiPo | ₹900 |
| Enclosure | IP67 waterproof rated | ₹350 |
| **Total per vessel node** | | **₹2,600 – 3,500** |

**Range per hop:** 5–25 km open water
**Battery life (no sun):** 50–200 days standby
**With solar:** indefinite operation

**Ocean relay buoy** (additional hardware for deep-sea coverage):
HDPE drum float + mooring chain + concrete seabed anchor — additional ₹2,000–4,000 per buoy

---

## 👥 Team BYTECLUB

Built for the **Coastal Innovation Hackathon** under the **Smart & Sustainable Cities** track.

> Theme: *Develop a real-time maritime emergency response system that enables instant distress alerts, coordinated rescue dispatch, and seamless communication between distressed vessels, rescue teams, and onshore authorities.*

---

## 📄 License

MIT — built for open coastal safety infrastructure.

---

<div align="center">
  <strong>AQUA-SENTINEL</strong> by Team BYTECLUB<br/>
  Coastal Innovation Hackathon · Smart & Sustainable Cities<br/><br/>
  <em>"Because every fisherman deserves to come home."</em>
</div>
