import db from "./database";

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vessels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('FISHING', 'COMMUTE', 'SECURITY')),
      owner_name TEXT,
      home_port TEXT,
      assigned_node_id TEXT,
      lat REAL,
      lng REAL,
      heading REAL DEFAULT 0,
      speed REAL DEFAULT 0,
      status TEXT DEFAULT 'online' CHECK(status IN ('online', 'alert', 'degraded', 'offline')),
      battery_pct INTEGER DEFAULT 100,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('shore', 'buoy', 'vessel')),
      location_name TEXT,
      lat REAL,
      lng REAL,
      status TEXT DEFAULT 'online' CHECK(status IN ('online', 'degraded', 'offline')),
      signal_strength INTEGER DEFAULT 5,
      battery_pct INTEGER DEFAULT 100,
      uptime_pct REAL DEFAULT 100.0,
      last_ping TEXT DEFAULT CURRENT_TIMESTAMP,
      firmware_version TEXT DEFAULT 'v2.1.0',
      installed_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      vessel_id TEXT REFERENCES vessels(id) ON DELETE CASCADE,
      node_id TEXT REFERENCES nodes(id) ON DELETE SET NULL,
      type TEXT CHECK(type IN ('CAPSIZE', 'MANUAL_SOS', 'WELFARE_CHECK')),
      lat REAL,
      lng REAL,
      hop_count INTEGER DEFAULT 1,
      status TEXT DEFAULT 'incoming' CHECK(status IN ('incoming', 'drone_dispatched', 'rescue_en_route', 'resolved', 'false_positive')),
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at TEXT,
      drone_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS drone_missions (
      id TEXT PRIMARY KEY,
      drone_id TEXT REFERENCES drones(id),
      alert_id TEXT REFERENCES alerts(id) ON DELETE CASCADE,
      target_vessel_id TEXT REFERENCES vessels(id),
      dispatch_time TEXT,
      arrival_time TEXT,
      return_time TEXT,
      duration_minutes INTEGER,
      outcome TEXT CHECK(outcome IN ('SUCCESS', 'ABORTED', 'IN_PROGRESS')),
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS vessel_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vessel_id TEXT REFERENCES vessels(id) ON DELETE CASCADE,
      lat REAL,
      lng REAL,
      heading REAL,
      speed REAL,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS network_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hour INTEGER,
      messages_relayed INTEGER DEFAULT 0,
      alerts_triggered INTEGER DEFAULT 0,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS drones (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'standby' CHECK(status IN ('standby', 'deployed', 'returning', 'maintenance')),
      battery_pct INTEGER DEFAULT 100,
      mission_progress INTEGER DEFAULT 0,
      eta_minutes INTEGER,
      target_vessel_id TEXT,
      current_lat REAL,
      current_lng REAL,
      home_lat REAL,
      home_lng REAL
    );
  `);
}
