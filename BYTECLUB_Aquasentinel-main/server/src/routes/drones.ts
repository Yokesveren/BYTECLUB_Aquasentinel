import { Router, Request, Response } from "express";
import db from "../db/database";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// GET /api/drones/missions
router.get("/missions", (req: Request, res: Response) => {
  try {
    const missions = db.prepare("SELECT * FROM drone_missions ORDER BY dispatch_time DESC").all();
    res.json(missions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drones
router.get("/", (req: Request, res: Response) => {
  try {
    const drones = db.prepare("SELECT * FROM drones").all();
    res.json(drones);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drones/:id
router.get("/:id", (req: Request, res: Response) => {
  try {
    const drone = db.prepare("SELECT * FROM drones WHERE id = ?").get(req.params.id);
    if (!drone) {
      return res.status(404).json({ error: "Drone not found" });
    }
    res.json(drone);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drones/:id/deploy
router.post("/:id/deploy", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { alertId, targetVesselId } = req.body;

    if (!alertId || !targetVesselId) {
      return res.status(400).json({ error: "Missing alertId or targetVesselId" });
    }

    const drone = db.prepare("SELECT * FROM drones WHERE id = ?").get(id) as any;
    if (!drone) {
      return res.status(404).json({ error: "Drone not found" });
    }

    if (drone.status !== "standby" && drone.status !== "returning") {
      return res.status(400).json({ error: "Drone is not available for deployment" });
    }

    const missionId = uuidv4();
    const dispatchTime = new Date().toISOString();

    // 1. UPDATE drones SET status='deployed', target_vessel_id=?, mission_progress=0 WHERE id=?
    db.prepare(`
      UPDATE drones 
      SET status = 'deployed', target_vessel_id = ?, mission_progress = 0, eta_minutes = 3
      WHERE id = ?
    `).run(targetVesselId, id);

    // 2. INSERT INTO drone_missions (id, drone_id, alert_id, target_vessel_id, dispatch_time, outcome) VALUES (?,?,?,?,?, 'IN_PROGRESS')
    db.prepare(`
      INSERT INTO drone_missions (id, drone_id, alert_id, target_vessel_id, dispatch_time, outcome)
      VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS')
    `).run(missionId, id, alertId, targetVesselId, dispatchTime);

    // 3. PATCH alert status to 'drone_dispatched' and assign drone_id
    db.prepare(`
      UPDATE alerts
      SET status = 'drone_dispatched', drone_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id, alertId);

    const updatedDrone = db.prepare("SELECT * FROM drones WHERE id = ?").get(id);
    const mission = db.prepare("SELECT * FROM drone_missions WHERE id = ?").get(missionId);

    const reqIo = req.app.get("socketio");
    if (reqIo) {
      reqIo.emit("drone:update", {
        droneId: id,
        status: "deployed",
        progress: 0,
        eta: 3,
        targetVesselId
      });
      reqIo.emit("alert:status-change", { alertId, newStatus: "drone_dispatched" });
    }

    // Start automated progress simulator ticks in background for manual dispatch as well
    let progress = 0;
    const interval = setInterval(() => {
      try {
        const d = db.prepare("SELECT * FROM drones WHERE id = ?").get(id) as any;
        if (!d || d.status !== "deployed" || d.target_vessel_id !== targetVesselId) {
          clearInterval(interval);
          return;
        }

        progress += 10;
        const eta = Math.max(0, 3 - Math.floor(progress / 33));
        const battery = Math.max(5, d.battery_pct - 1);

        db.prepare(`
          UPDATE drones
          SET mission_progress = ?, eta_minutes = ?, battery_pct = ?
          WHERE id = ?
        `).run(progress, eta, battery, id);

        if (reqIo) {
          reqIo.emit("drone:update", {
            droneId: id,
            status: "deployed",
            progress,
            eta,
            targetVesselId
          });
        }

        if (progress >= 100) {
          clearInterval(interval);
          console.log(`Drone ${id} reached manual target ${targetVesselId}`);
          
          // Auto advance alert to rescue_en_route after arrival
          setTimeout(() => {
            try {
              const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(alertId) as any;
              if (alert && alert.status === "drone_dispatched") {
                db.prepare(`
                  UPDATE alerts
                  SET status = 'rescue_en_route', updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `).run(alertId);
                
                if (reqIo) {
                  reqIo.emit("alert:status-change", { alertId, newStatus: "rescue_en_route" });
                }
              }
            } catch (err) {}
          }, 5000);
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 1000);

    res.json({
      success: true,
      drone: updatedDrone,
      mission
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drones/:id/return
router.post("/:id/return", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const drone = db.prepare("SELECT * FROM drones WHERE id = ?").get(id) as any;
    if (!drone) {
      return res.status(404).json({ error: "Drone not found" });
    }

    db.prepare(`
      UPDATE drones
      SET status = 'returning', target_vessel_id = NULL, mission_progress = 0, eta_minutes = 0
      WHERE id = ?
    `).run(id);

    // Update ongoing mission to ABORTED/SUCCESS if returning
    db.prepare(`
      UPDATE drone_missions
      SET return_time = datetime('now'), outcome = 'SUCCESS', duration_minutes = 15
      WHERE drone_id = ? AND outcome = 'IN_PROGRESS'
    `).run(id);

    const updatedDrone = db.prepare("SELECT * FROM drones WHERE id = ?").get(id);

    const reqIo = req.app.get("socketio");
    if (reqIo) {
      reqIo.emit("drone:update", {
        droneId: id,
        status: "returning",
        progress: 0,
        eta: 0,
        targetVesselId: null
      });
    }

    // Simulate return to base timer (e.g. 5 seconds later resets to standby)
    setTimeout(() => {
      try {
        db.prepare(`
          UPDATE drones
          SET status = 'standby', battery_pct = 100
          WHERE id = ? AND status = 'returning'
        `).run(id);
        
        if (reqIo) {
          reqIo.emit("drone:update", {
            droneId: id,
            status: "standby",
            progress: 0,
            eta: 0,
            targetVesselId: null
          });
        }
        console.log(`Drone ${id} returned to base and recharged.`);
      } catch (err) {}
    }, 5000);

    res.json({ success: true, drone: updatedDrone });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
