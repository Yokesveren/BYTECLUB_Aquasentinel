import { Server } from "socket.io";
import db from "../db/database";
import { v4 as uuidv4 } from "uuid";

export function startSimulation(io: Server) {
  console.log("Simulation engine started.");

  // Helper to get settings
  const getSetting = (key: string, defaultValue: string): string => {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string };
      return row ? row.value : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // 1. Vessel Movement (Every 2 seconds)
  setInterval(() => {
    try {
      const vessels = db.prepare("SELECT * FROM vessels").all() as any[];

      vessels.forEach(vessel => {
        let heading = vessel.heading + (Math.random() - 0.5) * 6; // slightly larger heading drift for more obvious movement
        heading = (heading + 360) % 360;

        const headingRad = (heading * Math.PI) / 180;
        let lat = vessel.lat + Math.sin(headingRad) * vessel.speed * 0.0001;
        let lng = vessel.lng + Math.cos(headingRad) * vessel.speed * 0.0001;

        // Bounce boundaries: Bay of Bengal (lat 5–22, lng 70–95)
        if (lat < 5 || lat > 22) {
          heading = (180 - heading + 360) % 360;
          lat = Math.max(5, Math.min(22, lat));
        }
        if (lng < 70 || lng > 95) {
          heading = (360 - heading + 360) % 360;
          lng = Math.max(70, Math.min(95, lng));
        }

        // Update DB
        db.prepare(`
          UPDATE vessels
          SET lat = ?, lng = ?, heading = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(lat, lng, heading, vessel.id);

        // Record Position (keep last 8)
        db.prepare(`
          INSERT INTO vessel_positions (vessel_id, lat, lng, heading, speed)
          VALUES (?, ?, ?, ?, ?)
        `).run(vessel.id, lat, lng, heading, vessel.speed);

        // Delete positions older than 8
        const posCount = db.prepare("SELECT COUNT(*) as count FROM vessel_positions WHERE vessel_id = ?").get(vessel.id) as { count: number };
        if (posCount.count > 8) {
          db.prepare(`
            DELETE FROM vessel_positions 
            WHERE id IN (
              SELECT id FROM vessel_positions 
              WHERE vessel_id = ? 
              ORDER BY recorded_at ASC 
              LIMIT ?
            )
          `).run(vessel.id, posCount.count - 8);
        }

        // Emit Socket update
        io.emit("vessel:update", {
          vesselId: vessel.id,
          lat,
          lng,
          heading,
          speed: vessel.speed,
          status: vessel.status
        });
      });

      // Emit stats update
      emitDashboardStats(io);

    } catch (err) {
      console.error("Error in vessel movement simulation:", err);
    }
  }, 2000);

  // 2. Random Distress Alert Generator (Every 15–20 seconds)
  const triggerNextAlert = () => {
    const delay = Math.floor(Math.random() * 5000) + 15000; // 15-20s
    setTimeout(() => {
      try {
        // Pick a vessel that is online and not already in alert
        const candidates = db.prepare(`
          SELECT * FROM vessels 
          WHERE status = 'online'
        `).all() as any[];

        if (candidates.length > 0) {
          const vessel = candidates[Math.floor(Math.random() * candidates.length)];
          const type = Math.random() < 0.6 ? "CAPSIZE" : "MANUAL_SOS";
          const alertId = uuidv4();

          // Create alert
          db.prepare(`
            INSERT INTO alerts (id, vessel_id, node_id, type, lat, lng, status, acknowledged)
            VALUES (?, ?, ?, ?, ?, ?, 'incoming', 0)
          `).run(alertId, vessel.id, vessel.assigned_node_id, type, vessel.lat, vessel.lng);

          // Update vessel status
          db.prepare("UPDATE vessels SET status = 'alert' WHERE id = ?").run(vessel.id);

          const newAlert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(alertId) as any;

          // Emit alert:new
          io.emit("alert:new", newAlert);
          console.log(`Alert generated: ${vessel.id} (${type})`);

          // Start auto-progression timers
          startAlertProgression(io, alertId);
        }
      } catch (err) {
        console.error("Error generating alert:", err);
      }
      triggerNextAlert();
    }, delay);
  };
  triggerNextAlert();

  // 3. Auto-Progression of Alerts
  function startAlertProgression(io: Server, alertId: string) {
    // Phase 1: progress to 'drone_dispatched' after 8 seconds
    setTimeout(() => {
      try {
        const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(alertId) as any;
        if (!alert || alert.status !== "incoming") return;

        const autoDispatch = getSetting("auto_drone_dispatch", "true") === "true";
        if (autoDispatch) {
          // Find available drone
          const drone = db.prepare("SELECT * FROM drones WHERE status = 'standby' LIMIT 1").get() as any;
          if (drone) {
            // Deploy drone
            db.prepare(`
              UPDATE drones 
              SET status = 'deployed', target_vessel_id = ?, mission_progress = 0, eta_minutes = 3
              WHERE id = ?
            `).run(alert.vessel_id, drone.id);

            db.prepare(`
              UPDATE alerts 
              SET status = 'drone_dispatched', drone_id = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(drone.id, alertId);

            db.prepare(`
              INSERT INTO drone_missions (id, drone_id, alert_id, target_vessel_id, dispatch_time, outcome)
              VALUES (?, ?, ?, ?, datetime('now'), 'IN_PROGRESS')
            `).run(uuidv4(), drone.id, alertId, alert.vessel_id);

            io.emit("alert:status-change", { alertId, newStatus: "drone_dispatched" });
            io.emit("drone:update", {
              droneId: drone.id,
              status: "deployed",
              progress: 0,
              eta: 3,
              targetVesselId: alert.vessel_id
            });
            console.log(`Auto-dispatched drone ${drone.id} to alert ${alertId}`);

            // Start mission progress simulation
            simulateDroneFlight(io, drone.id, alertId);

            // Phase 2: progress to 'rescue_en_route' 25 seconds after dispatch
            setTimeout(() => {
              try {
                const updatedAlert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(alertId) as any;
                if (updatedAlert && updatedAlert.status === "drone_dispatched") {
                  db.prepare(`
                    UPDATE alerts 
                    SET status = 'rescue_en_route', updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                  `).run(alertId);

                  io.emit("alert:status-change", { alertId, newStatus: "rescue_en_route" });
                  console.log(`Alert ${alertId} status progressed to rescue_en_route`);
                }
              } catch (progressErr) {
                console.error(progressErr);
              }
            }, 25000);
          }
        }
      } catch (err) {
        console.error("Error progressing alert:", err);
      }
    }, 8000);
  }

  // Simulate drone flight ticks (every 1 second for 15-20 seconds to complete mission or return)
  function simulateDroneFlight(io: Server, droneId: string, alertId: string) {
    let progress = 0;
    const interval = setInterval(() => {
      try {
        const drone = db.prepare("SELECT * FROM drones WHERE id = ?").get(droneId) as any;
        if (!drone || drone.status !== "deployed") {
          clearInterval(interval);
          return;
        }

        progress += 10;
        const eta = Math.max(0, 3 - Math.floor(progress / 33));
        const battery = Math.max(5, drone.battery_pct - 1);

        db.prepare(`
          UPDATE drones
          SET mission_progress = ?, eta_minutes = ?, battery_pct = ?
          WHERE id = ?
        `).run(progress, eta, battery, droneId);

        io.emit("drone:update", {
          droneId,
          status: "deployed",
          progress,
          eta,
          targetVesselId: drone.target_vessel_id
        });

        if (progress >= 100) {
          clearInterval(interval);
          console.log(`Drone ${droneId} reached target.`);
        }
      } catch (err) {
        console.error("Error during drone flight simulation:", err);
        clearInterval(interval);
      }
    }, 1000);
  }

  // 4. Random Node Degradation (Every 2 minutes)
  setInterval(() => {
    try {
      const nodes = db.prepare("SELECT * FROM nodes WHERE status = 'online'").all() as any[];
      if (nodes.length > 0) {
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        
        // Degrade node
        db.prepare("UPDATE nodes SET status = 'degraded', signal_strength = 2 WHERE id = ?").run(randomNode.id);
        io.emit("node:status-change", { nodeId: randomNode.id, status: "degraded", signalStrength: 2 });
        console.log(`Node degraded: ${randomNode.id}`);

        // Restore node after 30 seconds
        setTimeout(() => {
          try {
            db.prepare("UPDATE nodes SET status = 'online', signal_strength = 5 WHERE id = ?").run(randomNode.id);
            io.emit("node:status-change", { nodeId: randomNode.id, status: "online", signalStrength: 5 });
            console.log(`Node restored: ${randomNode.id}`);
          } catch (restoreErr) {
            console.error(restoreErr);
          }
        }, 30000);
      }
    } catch (err) {
      console.error("Error in node degradation simulation:", err);
    }
  }, 120000);

  // 5. Hourly Network Activity Logging (Every hour)
  // Since we don't want to wait an actual hour to generate data for testing,
  // let's run it every hour but seed all 24 hours of data.
  setInterval(() => {
    try {
      const hour = new Date().getHours();
      const messages = Math.floor(Math.random() * 150) + 50;
      const alerts = 0; // count new ones in real hourly scenario
      db.prepare(`
        INSERT INTO network_activity (hour, messages_relayed, alerts_triggered)
        VALUES (?, ?, ?)
      `).run(hour, messages, alerts);

      console.log(`Hourly network activity recorded: hour ${hour}, messages ${messages}`);
    } catch (err) {
      console.error("Error logging hourly activity:", err);
    }
  }, 3600000);
}

// Function to emit aggregated dashboard counts
function emitDashboardStats(io: Server) {
  try {
    const vesselsCount = db.prepare("SELECT COUNT(*) as count FROM vessels").get() as { count: number };
    const nodesCount = db.prepare("SELECT COUNT(*) as count FROM nodes WHERE status != 'offline'").get() as { count: number };
    const alertsCount = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status IN ('incoming', 'drone_dispatched', 'rescue_en_route')").get() as { count: number };
    const dronesCount = db.prepare("SELECT COUNT(*) as count FROM drones WHERE status = 'deployed'").get() as { count: number };
    
    io.emit("stats:update", {
      vesselsCount: vesselsCount.count,
      nodesCount: nodesCount.count,
      alertsCount: alertsCount.count,
      dronesCount: dronesCount.count
    });
  } catch (err) {
    console.error("Error emitting stats update:", err);
  }
}
