import { Router, Request, Response } from "express";
import db from "../db/database";

const router = Router();

// Helper to calculate Haversine distance in km
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/nodes
router.get("/", (req: Request, res: Response) => {
  try {
    const data = db.prepare("SELECT * FROM nodes").all();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nodes/:id/neighbors
router.get("/:id/neighbors", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const targetNode = db.prepare("SELECT * FROM nodes WHERE id = ?").get(id) as any;
    if (!targetNode) {
      return res.status(404).json({ error: "Node not found" });
    }

    const allNodes = db.prepare("SELECT * FROM nodes WHERE id != ?").all() as any[];
    
    // We will use 350km threshold to ensure we show actual mesh connections between the buoy nodes and shoreline
    const neighbors = allNodes
      .map(node => {
        const distance = calculateDistance(targetNode.lat, targetNode.lng, node.lat, node.lng);
        return {
          ...node,
          distance,
          signal_quality: distance < 100 ? "Excellent" : distance < 200 ? "Good" : "Fair"
        };
      })
      .filter(node => node.distance <= 350)
      .sort((a, b) => a.distance - b.distance);

    res.json(neighbors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nodes/:id/ping
router.post("/:id/ping", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const node = db.prepare("SELECT * FROM nodes WHERE id = ?").get(id) as any;
    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    res.json({
      latency: Math.floor(Math.random() * 80) + 20, // 20 - 100ms
      timestamp: new Date().toISOString(),
      status: node.status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nodes
router.post("/", (req: Request, res: Response) => {
  try {
    const { id, name, type, location_name, lat, lng, status = "online", signal_strength = 5, battery_pct = 100, uptime_pct = 100.0 } = req.body;
    if (!id || !name || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    db.prepare(`
      INSERT INTO nodes (id, name, type, location_name, lat, lng, status, signal_strength, battery_pct, uptime_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type, location_name || null, Number(lat || 0), Number(lng || 0), status, Number(signal_strength), Number(battery_pct), Number(uptime_pct));

    const newNode = db.prepare("SELECT * FROM nodes WHERE id = ?").get(id);

    const reqIo = req.app.get("socketio");
    if (reqIo) {
      reqIo.emit("node:status-change", { nodeId: id, status, signalStrength: signal_strength });
    }

    res.status(201).json(newNode);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/nodes/:id
router.put("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, location_name, lat, lng, status, signal_strength, battery_pct, uptime_pct } = req.body;

    const existing = db.prepare("SELECT * FROM nodes WHERE id = ?").get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: "Node not found" });
    }

    db.prepare(`
      UPDATE nodes
      SET name = ?, type = ?, location_name = ?, lat = ?, lng = ?, status = ?, signal_strength = ?, battery_pct = ?, uptime_pct = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name : existing.name,
      type !== undefined ? type : existing.type,
      location_name !== undefined ? location_name : existing.location_name,
      lat !== undefined ? Number(lat) : existing.lat,
      lng !== undefined ? Number(lng) : existing.lng,
      status !== undefined ? status : existing.status,
      signal_strength !== undefined ? Number(signal_strength) : existing.signal_strength,
      battery_pct !== undefined ? Number(battery_pct) : existing.battery_pct,
      uptime_pct !== undefined ? Number(uptime_pct) : existing.uptime_pct,
      id
    );

    const updated = db.prepare("SELECT * FROM nodes WHERE id = ?").get(id);

    const reqIo = req.app.get("socketio");
    if (reqIo) {
      reqIo.emit("node:status-change", { nodeId: id, status: updated.status, signalStrength: updated.signal_strength });
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/nodes/:id
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = db.prepare("DELETE FROM nodes WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Node not found" });
    }
    res.json({ success: true, message: `Node ${id} deleted.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
