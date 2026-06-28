import db from "./database";
import { initSchema } from "./schema";
import { v4 as uuidv4 } from "uuid";

export function seedDatabase() {
  initSchema();

  // Check if already seeded
  const check = db.prepare("SELECT count(*) as count FROM vessels").get() as { count: number };
  if (check.count > 0) {
    console.log("Database already seeded.");
    return;
  }

  console.log("Seeding database...");

  // 1. Seed 10 vessels
  const vessels = [
    { id: "F-001", name: "Ocean Bounty", type: "FISHING", owner_name: "Ram Krishnan", home_port: "Chennai", assigned_node_id: "SG-IND-01", lat: 12.5, lng: 81.2, heading: 45, speed: 6.2, status: "online", battery_pct: 94 },
    { id: "F-002", name: "Sea Pearl", type: "FISHING", owner_name: "Amit Sen", home_port: "Visakhapatnam", assigned_node_id: "SG-IND-04", lat: 15.2, lng: 85.6, heading: 120, speed: 5.5, status: "online", battery_pct: 88 },
    { id: "F-003", name: "Matsya 3", type: "FISHING", owner_name: "Karan Johar", home_port: "Kochi", assigned_node_id: "SG-IND-03", lat: 9.2, lng: 77.5, heading: 210, speed: 4.8, status: "online", battery_pct: 79 },
    { id: "F-004", name: "Kadal Devi", type: "FISHING", owner_name: "M. Selvam", home_port: "Chennai", assigned_node_id: "BR-IND-01", lat: 11.4, lng: 82.2, heading: 90, speed: 7.0, status: "online", battery_pct: 91 },
    { id: "C-001", name: "Bay Ferry", type: "COMMUTE", owner_name: "Ocean Transits", home_port: "Chittagong", assigned_node_id: "SG-BGD-01", lat: 21.8, lng: 91.2, heading: 180, speed: 12.4, status: "online", battery_pct: 99 },
    { id: "C-002", name: "Colombo Express", type: "COMMUTE", owner_name: "Lanka Ferries", home_port: "Colombo", assigned_node_id: "SG-LKA-01", lat: 7.1, lng: 80.1, heading: 315, speed: 14.2, status: "online", battery_pct: 95 },
    { id: "C-003", name: "Andaman Cruiser", type: "COMMUTE", owner_name: "Island Connect", home_port: "Port Blair", assigned_node_id: "BR-IND-04", lat: 12.0, lng: 92.8, heading: 10, speed: 15.0, status: "online", battery_pct: 86 },
    { id: "S-001", name: "Sentinel Guard", type: "SECURITY", owner_name: "Indian Coast Guard", home_port: "Visakhapatnam", assigned_node_id: "SG-IND-04", lat: 16.5, lng: 83.8, heading: 270, speed: 18.5, status: "online", battery_pct: 100 },
    { id: "F-005", name: "Net Catcher", type: "FISHING", owner_name: "Hassan Ali", home_port: "Cox's Bazar", assigned_node_id: "BR-BGD-01", lat: 20.9, lng: 90.1, heading: 145, speed: 5.1, status: "online", battery_pct: 82 },
    { id: "C-004", name: "Vasco Express", type: "COMMUTE", owner_name: "Goa Shippings", home_port: "Mumbai", assigned_node_id: "SG-IND-02", lat: 18.5, lng: 72.5, heading: 160, speed: 10.8, status: "online", battery_pct: 90 }
  ];

  const insertVessel = db.prepare(`
    INSERT INTO vessels (id, name, type, owner_name, home_port, assigned_node_id, lat, lng, heading, speed, status, battery_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  vessels.forEach(v => {
    insertVessel.run(v.id, v.name, v.type, v.owner_name, v.home_port, v.assigned_node_id, v.lat, v.lng, v.heading, v.speed, v.status, v.battery_pct);
  });

  // 2. Seed 47 nodes
  const nodes = [
    { id: "SG-IND-01", name: "Chennai Gateway", type: "shore", location_name: "Chennai, India", lat: 13.08, lng: 80.27, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.8 },
    { id: "SG-IND-02", name: "Mumbai Command", type: "shore", location_name: "Mumbai, India", lat: 18.96, lng: 72.82, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.9 },
    { id: "SG-IND-03", name: "Kochi Station", type: "shore", location_name: "Kochi, India", lat: 9.93, lng: 76.26, status: "online", signal_strength: 4, battery_pct: 100, uptime_pct: 99.5 },
    { id: "SG-IND-04", name: "Visakhapatnam Hub", type: "shore", location_name: "Visakhapatnam, India", lat: 17.68, lng: 83.21, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.9 },
    { id: "BR-IND-01", name: "Bay of Bengal B1", type: "buoy", location_name: "Bay of Bengal Central", lat: 11.2, lng: 82.5, status: "online", signal_strength: 4, battery_pct: 85, uptime_pct: 98.4 },
    { id: "BR-IND-02", name: "Bay of Bengal B2", type: "buoy", location_name: "Bay of Bengal South", lat: 9.5, lng: 79.8, status: "online", signal_strength: 3, battery_pct: 79, uptime_pct: 97.2 },
    { id: "BR-IND-03", name: "Lakshadweep Relay", type: "buoy", location_name: "Lakshadweep Sea", lat: 10.5, lng: 72.6, status: "online", signal_strength: 4, battery_pct: 92, uptime_pct: 98.9 },
    { id: "BR-IND-04", name: "Andaman Relay", type: "buoy", location_name: "Andaman Sea North", lat: 12.1, lng: 93.4, status: "online", signal_strength: 3, battery_pct: 88, uptime_pct: 98.1 },
    { id: "SG-BGD-01", name: "Chittagong Gateway", type: "shore", location_name: "Chittagong, Bangladesh", lat: 22.33, lng: 91.83, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.7 },
    { id: "BR-BGD-01", name: "Bay Relay BD-1", type: "buoy", location_name: "North Bay of Bengal", lat: 21.5, lng: 90.8, status: "online", signal_strength: 4, battery_pct: 83, uptime_pct: 97.9 },
    { id: "SG-LKA-01", name: "Colombo Station", type: "shore", location_name: "Colombo, Sri Lanka", lat: 6.92, lng: 79.85, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.8 },
    { id: "BR-LKA-01", name: "Ceylon Relay", type: "buoy", location_name: "East Sri Lanka", lat: 7.5, lng: 81.2, status: "online", signal_strength: 4, battery_pct: 90, uptime_pct: 98.5 },
    { id: "SG-IDN-01", name: "Jakarta Command", type: "shore", location_name: "Jakarta, Indonesia", lat: -6.21, lng: 106.85, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.9 },
    { id: "SG-IDN-02", name: "Makassar Gateway", type: "shore", location_name: "Makassar, Indonesia", lat: -5.13, lng: 119.41, status: "online", signal_strength: 4, battery_pct: 100, uptime_pct: 99.6 },
    { id: "BR-IDN-01", name: "Java Sea Relay", type: "buoy", location_name: "Java Sea", lat: -5.5, lng: 108.2, status: "online", signal_strength: 3, battery_pct: 84, uptime_pct: 97.4 },
    { id: "BR-IDN-02", name: "Banda Sea Relay", type: "buoy", location_name: "Banda Sea", lat: -4.2, lng: 128.6, status: "online", signal_strength: 3, battery_pct: 81, uptime_pct: 97.0 },
    { id: "SG-PHL-01", name: "Manila Station", type: "shore", location_name: "Manila, Philippines", lat: 14.59, lng: 120.98, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.8 },
    { id: "BR-PHL-01", name: "South China Sea B1", type: "buoy", location_name: "West Philippines Sea", lat: 13.5, lng: 118.4, status: "online", signal_strength: 4, battery_pct: 89, uptime_pct: 98.2 },
    { id: "SG-VNM-01", name: "Ho Chi Minh Gateway", type: "shore", location_name: "Ho Chi Minh, Vietnam", lat: 10.82, lng: 106.63, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.9 },
    { id: "SG-THA-01", name: "Bangkok Station", type: "shore", location_name: "Bangkok, Thailand", lat: 12.5, lng: 100.9, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.7 },
    { id: "SG-NGA-01", name: "Lagos Command", type: "shore", location_name: "Lagos, Nigeria", lat: 6.45, lng: 3.39, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.4 },
    { id: "BR-NGA-01", name: "Gulf of Guinea B1", type: "buoy", location_name: "Gulf of Guinea", lat: 3.5, lng: 2.8, status: "online", signal_strength: 3, battery_pct: 78, uptime_pct: 96.5 },
    { id: "SG-GHA-01", name: "Accra Station", type: "shore", location_name: "Accra, Ghana", lat: 5.55, lng: -0.20, status: "online", signal_strength: 4, battery_pct: 100, uptime_pct: 99.5 },
    { id: "SG-KEN-01", name: "Mombasa Gateway", type: "shore", location_name: "Mombasa, Kenya", lat: -4.05, lng: 39.67, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.7 },
    { id: "BR-KEN-01", name: "Indian Ocean K-1", type: "buoy", location_name: "East African Coast", lat: -6.5, lng: 41.2, status: "online", signal_strength: 3, battery_pct: 82, uptime_pct: 97.6 },
    { id: "SG-TZA-01", name: "Dar es Salaam Hub", type: "shore", location_name: "Dar es Salaam, Tanzania", lat: -6.79, lng: 39.20, status: "online", signal_strength: 4, battery_pct: 100, uptime_pct: 99.6 },
    { id: "SG-PRT-01", name: "Lisbon Station", type: "shore", location_name: "Lisbon, Portugal", lat: 38.72, lng: -9.14, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.9 },
    { id: "SG-ESP-01", name: "Barcelona Gateway", type: "shore", location_name: "Barcelona, Spain", lat: 41.38, lng: 2.17, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.9 },
    { id: "SG-GRC-01", name: "Athens Command", type: "shore", location_name: "Athens, Greece", lat: 37.97, lng: 23.73, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.8 },
    { id: "BR-MED-01", name: "Mediterranean B1", type: "buoy", location_name: "Central Mediterranean", lat: 37.5, lng: 14.8, status: "online", signal_strength: 4, battery_pct: 87, uptime_pct: 98.3 },
    { id: "BR-MED-02", name: "Mediterranean B2", type: "buoy", location_name: "Aegean Sea", lat: 38.2, lng: 25.5, status: "online", signal_strength: 4, battery_pct: 85, uptime_pct: 98.1 },
    { id: "SG-NOR-01", name: "Bergen Station", type: "shore", location_name: "Bergen, Norway", lat: 60.39, lng: 5.32, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.9 },
    { id: "SG-BRA-01", name: "Recife Command", type: "shore", location_name: "Recife, Brazil", lat: -8.05, lng: -34.88, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.8 },
    { id: "BR-ATL-01", name: "Atlantic Relay B1", type: "buoy", location_name: "Equatorial Atlantic", lat: -2.5, lng: -32.1, status: "online", signal_strength: 3, battery_pct: 80, uptime_pct: 97.2 },
    { id: "SG-MEX-01", name: "Veracruz Station", type: "shore", location_name: "Veracruz, Mexico", lat: 19.19, lng: -96.14, status: "online", signal_strength: 4, battery_pct: 100, uptime_pct: 99.5 },
    { id: "SG-USA-01", name: "Miami Gateway", type: "shore", location_name: "Miami, USA", lat: 25.77, lng: -80.19, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.9 },
    { id: "SG-JPN-01", name: "Tokyo Station", type: "shore", location_name: "Tokyo, Japan", lat: 35.68, lng: 139.69, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.9 },
    { id: "BR-PAC-01", name: "Pacific Relay P1", type: "buoy", location_name: "Northwest Pacific", lat: 32.5, lng: 148.2, status: "online", signal_strength: 3, battery_pct: 83, uptime_pct: 97.7 },
    { id: "SG-AUS-01", name: "Darwin Command", type: "shore", location_name: "Darwin, Australia", lat: -12.46, lng: 130.84, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.8 },
    { id: "SG-AUS-02", name: "Sydney Station", type: "shore", location_name: "Sydney, Australia", lat: -33.87, lng: 151.21, status: "online", signal_strength: 5, battery_pct: 100, uptime_pct: 99.9 },
    // Remaining 7 vessel nodes (Bay of Bengal and nearby seas)
    { id: "VS-IND-01", name: "Sagar Kanya", type: "vessel", location_name: "Bay of Bengal C1", lat: 12.5, lng: 84.5, status: "online", signal_strength: 4, battery_pct: 95, uptime_pct: 99.1 },
    { id: "VS-IND-02", name: "Samudra Ratna", type: "vessel", location_name: "Bay of Bengal C2", lat: 10.2, lng: 81.5, status: "online", signal_strength: 4, battery_pct: 92, uptime_pct: 98.9 },
    { id: "VS-IND-03", name: "Jal Vahini", type: "vessel", location_name: "Bay of Bengal East", lat: 14.8, lng: 86.2, status: "online", signal_strength: 3, battery_pct: 88, uptime_pct: 98.4 },
    { id: "VS-IND-04", name: "Matsya Kumari", type: "vessel", location_name: "Gulf of Mannar", lat: 8.8, lng: 79.2, status: "online", signal_strength: 4, battery_pct: 90, uptime_pct: 99.0 },
    { id: "VS-IND-05", name: "Pawan Mukti", type: "vessel", location_name: "Bay of Bengal West", lat: 11.8, lng: 83.1, status: "online", signal_strength: 4, battery_pct: 91, uptime_pct: 98.7 },
    { id: "VS-IND-06", name: "Swarna Jyoti", type: "vessel", location_name: "Bay of Bengal North", lat: 15.2, lng: 88.5, status: "online", signal_strength: 3, battery_pct: 86, uptime_pct: 98.2 },
    { id: "VS-IND-07", name: "Ocean Explorer", type: "vessel", location_name: "Chennai Offshore", lat: 13.5, lng: 80.9, status: "online", signal_strength: 5, battery_pct: 94, uptime_pct: 99.4 }
  ];

  const insertNode = db.prepare(`
    INSERT INTO nodes (id, name, type, location_name, lat, lng, status, signal_strength, battery_pct, uptime_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  nodes.forEach(n => {
    insertNode.run(n.id, n.name, n.type, n.location_name, n.lat, n.lng, n.status, n.signal_strength, n.battery_pct, n.uptime_pct);
  });

  // 3. Seed 2 drones
  const drones = [
    { id: "DR-01", status: "standby", battery_pct: 100, mission_progress: 0, eta_minutes: 0, target_vessel_id: null, current_lat: 13.08, current_lng: 80.27, home_lat: 13.08, home_lng: 80.27 },
    { id: "DR-02", status: "standby", battery_pct: 87, mission_progress: 0, eta_minutes: 0, target_vessel_id: null, current_lat: 18.96, current_lng: 72.82, home_lat: 18.96, home_lng: 72.82 }
  ];

  const insertDrone = db.prepare(`
    INSERT INTO drones (id, status, battery_pct, mission_progress, eta_minutes, target_vessel_id, current_lat, current_lng, home_lat, home_lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  drones.forEach(d => {
    insertDrone.run(d.id, d.status, d.battery_pct, d.mission_progress, d.eta_minutes, d.target_vessel_id, d.current_lat, d.current_lng, d.home_lat, d.home_lng);
  });

  // 4. Seed 15 historical alerts
  // 5 resolved, 5 rescue_en_route, 3 drone_dispatched, 2 incoming
  const alertTypes = ["CAPSIZE", "MANUAL_SOS", "WELFARE_CHECK"];
  const alertStatuses = ["incoming", "drone_dispatched", "rescue_en_route", "resolved"];

  const seedAlerts = [
    { id: uuidv4(), vessel_id: "F-001", node_id: "SG-IND-01", type: "CAPSIZE", lat: 12.4, lng: 80.8, status: "resolved", acknowledged: 1, drone_id: "DR-01" },
    { id: uuidv4(), vessel_id: "F-002", node_id: "SG-IND-04", type: "MANUAL_SOS", lat: 15.0, lng: 85.0, status: "resolved", acknowledged: 1, drone_id: "DR-02" },
    { id: uuidv4(), vessel_id: "F-003", node_id: "SG-IND-03", type: "WELFARE_CHECK", lat: 9.0, lng: 77.0, status: "resolved", acknowledged: 1, drone_id: "DR-01" },
    { id: uuidv4(), vessel_id: "F-004", node_id: "BR-IND-01", type: "CAPSIZE", lat: 11.2, lng: 82.0, status: "resolved", acknowledged: 1, drone_id: "DR-01" },
    { id: uuidv4(), vessel_id: "C-001", node_id: "SG-BGD-01", type: "MANUAL_SOS", lat: 21.5, lng: 91.0, status: "resolved", acknowledged: 1, drone_id: "DR-02" },
    
    { id: uuidv4(), vessel_id: "C-002", node_id: "SG-LKA-01", type: "WELFARE_CHECK", lat: 6.8, lng: 79.9, status: "rescue_en_route", acknowledged: 1, drone_id: "DR-01" },
    { id: uuidv4(), vessel_id: "C-003", node_id: "BR-IND-04", type: "CAPSIZE", lat: 12.2, lng: 93.0, status: "rescue_en_route", acknowledged: 1, drone_id: "DR-02" },
    { id: uuidv4(), vessel_id: "F-005", node_id: "BR-BGD-01", type: "MANUAL_SOS", lat: 20.8, lng: 90.0, status: "rescue_en_route", acknowledged: 1, drone_id: "DR-01" },
    { id: uuidv4(), vessel_id: "C-004", node_id: "SG-IND-02", type: "WELFARE_CHECK", lat: 18.2, lng: 72.3, status: "rescue_en_route", acknowledged: 1, drone_id: "DR-02" },
    { id: uuidv4(), vessel_id: "F-001", node_id: "SG-IND-01", type: "CAPSIZE", lat: 12.6, lng: 81.3, status: "rescue_en_route", acknowledged: 1, drone_id: "DR-01" },

    { id: uuidv4(), vessel_id: "F-002", node_id: "SG-IND-04", type: "MANUAL_SOS", lat: 15.3, lng: 85.5, status: "drone_dispatched", acknowledged: 1, drone_id: "DR-01" },
    { id: uuidv4(), vessel_id: "F-003", node_id: "SG-IND-03", type: "WELFARE_CHECK", lat: 9.3, lng: 77.6, status: "drone_dispatched", acknowledged: 1, drone_id: "DR-02" },
    { id: uuidv4(), vessel_id: "F-004", node_id: "BR-IND-01", type: "CAPSIZE", lat: 11.5, lng: 82.3, status: "drone_dispatched", acknowledged: 1, drone_id: "DR-01" },

    { id: uuidv4(), vessel_id: "C-001", node_id: "SG-BGD-01", type: "MANUAL_SOS", lat: 21.9, lng: 91.3, status: "incoming", acknowledged: 0, drone_id: null },
    { id: uuidv4(), vessel_id: "C-002", node_id: "SG-LKA-01", type: "WELFARE_CHECK", lat: 7.2, lng: 80.2, status: "incoming", acknowledged: 0, drone_id: null }
  ];

  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, vessel_id, node_id, type, lat, lng, status, acknowledged, drone_id, created_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 hours'), ?)
  `);

  const insertVesselPosition = db.prepare(`
    INSERT INTO vessel_positions (vessel_id, lat, lng, heading, speed)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMission = db.prepare(`
    INSERT INTO drone_missions (id, drone_id, alert_id, target_vessel_id, dispatch_time, arrival_time, return_time, duration_minutes, outcome)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  seedAlerts.forEach((a) => {
    let resolvedAt: string | null = null;
    if (a.status === "resolved") {
      resolvedAt = new Date().toISOString();
    }
    insertAlert.run(a.id, a.vessel_id, a.node_id, a.type, a.lat, a.lng, a.status, a.acknowledged, a.drone_id, resolvedAt);

    // Seed some positions for historical track
    insertVesselPosition.run(a.vessel_id, a.lat - 0.05, a.lng - 0.05, 45, 5.0);
    insertVesselPosition.run(a.vessel_id, a.lat - 0.02, a.lng - 0.02, 45, 5.2);
    insertVesselPosition.run(a.vessel_id, a.lat, a.lng, 45, 5.0);

    // If drone dispatched or further, add a mission
    if (a.status !== "incoming") {
      insertMission.run(
        uuidv4(),
        a.drone_id || "DR-01",
        a.id,
        a.vessel_id,
        new Date(Date.now() - 3600000).toISOString(),
        a.status === "resolved" ? new Date(Date.now() - 1800000).toISOString() : null,
        a.status === "resolved" ? new Date().toISOString() : null,
        a.status === "resolved" ? 60 : null,
        a.status === "resolved" ? "SUCCESS" : "IN_PROGRESS"
      );
    }
  });

  // 5. Seed 24 hours of network activity
  const insertActivity = db.prepare(`
    INSERT INTO network_activity (hour, messages_relayed, alerts_triggered, recorded_at)
    VALUES (?, ?, ?, datetime('now', ?))
  `);

  for (let i = 24; i >= 1; i--) {
    const hour = (new Date(Date.now() - i * 3600000).getHours());
    const messages = Math.floor(Math.random() * 150) + 50;
    const alerts = Math.random() > 0.85 ? 1 : 0;
    insertActivity.run(hour, messages, alerts, `-${i} hours`);
  }

  // 6. Seed settings
  const settingsList = [
    { key: "capsize_sensitivity", value: "75" },
    { key: "welfare_timeout", value: "4" },
    { key: "auto_drone_dispatch", value: "true" },
    { key: "false_positive_cancel_window", value: "15" },
    { key: "lora_frequency", value: "868.1" },
    { key: "hop_limit", value: "5" },
    { key: "gps_broadcast_interval", value: "30" },
    { key: "node_offline_threshold", value: "10" },
    { key: "notifications_email", value: "alerts@aquasentinel.gov" },
    { key: "notifications_sms", value: "true" },
    { key: "notifications_push", value: "true" },
    { key: "notifications_sound", value: "true" }
  ];

  const insertSetting = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  settingsList.forEach(s => insertSetting.run(s.key, s.value));

  console.log("Database seeded successfully.");
}
