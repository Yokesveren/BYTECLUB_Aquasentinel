import { Router, Request, Response } from "express";
import db from "../db/database";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Helper to enrich alert with derived fields
function enrichAlert(alert: any) {
  if (!alert) return null;

  let critical_level = "MEDIUM";
  let creation_method = "DEAD_MAN_SWITCH";

  if (alert.type === "CAPSIZE") {
    critical_level = "CRITICAL";
    creation_method = "AUTO_SENSOR";
  } else if (alert.type === "MANUAL_SOS") {
    critical_level = "HIGH";
    creation_method = "PHYSICAL_BUTTON";
  } else if (alert.type === "WELFARE_CHECK") {
    critical_level = "MEDIUM";
    creation_method = "DEAD_MAN_SWITCH";
  }

  return {
    ...alert,
    critical_level,
    creation_method
  };
}

// GET /api/alerts
router.get("/", (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status = "All", type = "All", random = "false" } = req.query;

    if (random === "true") {
      const data = db.prepare("SELECT * FROM alerts ORDER BY RANDOM() LIMIT 10").all() as any[];
      return res.json(data.map(enrichAlert));
    }

    const offset = (Number(page) - 1) * Number(limit);
    let query = "SELECT * FROM alerts WHERE 1=1";
    const params: any[] = [];

    if (status && status !== "All") {
      query += " AND status = ?";
      params.push(status);
    }
    if (type && type !== "All") {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY created_at DESC";

    let countQuery = query.replace("SELECT *", "SELECT COUNT(*) as count");
    const totalCount = (db.prepare(countQuery).get(...params) as { count: number }).count;

    query += " LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const data = db.prepare(query).all(...params) as any[];

    res.json({
      data: data.map(enrichAlert),
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts/:id
router.get("/:id", (req: Request, res: Response) => {
  try {
    const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }
    res.json(enrichAlert(alert));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alerts
router.post("/", (req: Request, res: Response) => {
  try {
    const { vessel_id, node_id, type, lat, lng, hop_count = 1, status = "incoming" } = req.body;
    if (!vessel_id || !type) {
      return res.status(400).json({ error: "Missing vessel_id or type" });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO alerts (id, vessel_id, node_id, type, lat, lng, hop_count, status, acknowledged)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(id, vessel_id, node_id || null, type, Number(lat || 0), Number(lng || 0), Number(hop_count), status);

    // Update vessel status
    db.prepare("UPDATE vessels SET status = 'alert' WHERE id = ?").run(vessel_id);

    const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(id);
    
    // Broadcast via socket.io (handled by index.ts calling io.emit)
    const reqIo = req.app.get("socketio");
    if (reqIo) {
      reqIo.emit("alert:new", enrichAlert(alert));
    }

    res.status(201).json(enrichAlert(alert));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/alerts/:id/status
router.patch("/:id/status", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existing = db.prepare("SELECT * FROM alerts WHERE id = ?").get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: "Alert not found" });
    }

    let resolvedAt = existing.resolved_at;
    if (status === "resolved") {
      resolvedAt = new Date().toISOString();
      // Restore vessel to online
      db.prepare("UPDATE vessels SET status = 'online' WHERE id = ?").run(existing.vessel_id);
    }

    db.prepare(`
      UPDATE alerts
      SET status = ?, resolved_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, resolvedAt, id);

    const updated = db.prepare("SELECT * FROM alerts WHERE id = ?").get(id);

    const reqIo = req.app.get("socketio");
    if (reqIo) {
      reqIo.emit("alert:status-change", { alertId: id, newStatus: status });
      // If status is resolved, also update vessel status
      if (status === "resolved") {
        reqIo.emit("vessel:update", {
          vesselId: existing.vessel_id,
          status: "online"
        });
      }
    }

    res.json(enrichAlert(updated));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Acknowledge alert endpoints (both PATCH and POST)
const handleAcknowledge = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare("SELECT * FROM alerts WHERE id = ?").get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: "Alert not found" });
    }

    const acknowledged_at = new Date().toISOString();
    db.prepare(`
      UPDATE alerts
      SET acknowledged = 1, acknowledged_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(acknowledged_at, id);

    const updated = db.prepare("SELECT * FROM alerts WHERE id = ?").get(id);

    const reqIo = req.app.get("socketio");
    if (reqIo) {
      reqIo.emit("alert:status-change", { alertId: id, newStatus: existing.status, acknowledged: 1 });
    }

    res.json(enrichAlert(updated));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.patch("/:id/acknowledge", handleAcknowledge);
router.post("/:id/acknowledge", handleAcknowledge);

export default router;
