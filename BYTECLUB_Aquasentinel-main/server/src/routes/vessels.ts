import { Router, Request, Response } from "express";
import db from "../db/database";

const router = Router();

// GET /api/vessels
router.get("/", (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = "", type = "All", status = "All", sortBy = "id", sortOrder = "asc" } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let query = "SELECT * FROM vessels WHERE 1=1";
    const params: any[] = [];

    if (search) {
      const searchStr = String(search);
      query += " AND (id LIKE ? OR name LIKE ?)";
      params.push(`%${searchStr}%`, `%${searchStr}%`);
    }
    if (type && type !== "All") {
      query += " AND type = ?";
      params.push(String(type));
    }
    if (status && status !== "All") {
      query += " AND status = ?";
      params.push(String(status).toLowerCase());
    }

    // Sort check to prevent SQL injection
    const allowedSortColumns = ["id", "name", "type", "status", "speed", "battery_pct"];
    const verifiedSortBy = allowedSortColumns.includes(String(sortBy)) ? String(sortBy) : "id";
    const verifiedSortOrder = String(sortOrder).toLowerCase() === "desc" ? "DESC" : "ASC";

    query += ` ORDER BY ${verifiedSortBy} ${verifiedSortOrder}`;

    // Get total count
    let countQuery = query.replace("SELECT *", "SELECT COUNT(*) as count");
    const totalCount = (db.prepare(countQuery).get(...params) as { count: number }).count;

    query += " LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const data = db.prepare(query).all(...params);

    res.json({
      data,
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

// GET /api/vessels/:id/track
router.get("/:id/track", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const track = db.prepare(`
      SELECT lat, lng, heading, recorded_at 
      FROM vessel_positions 
      WHERE vessel_id = ? 
      ORDER BY recorded_at DESC 
      LIMIT 50
    `).all(id);
    res.json(track);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vessels/:id
router.get("/:id", (req: Request, res: Response) => {
  try {
    const vessel = db.prepare("SELECT * FROM vessels WHERE id = ?").get(req.params.id);
    if (!vessel) {
      return res.status(404).json({ error: "Vessel not found" });
    }
    res.json(vessel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vessels
router.post("/", (req: Request, res: Response) => {
  try {
    const { id, name, type, owner_name, home_port, assigned_node_id, lat, lng, heading = 0, speed = 0, status = "online", battery_pct = 100 } = req.body;
    
    if (!id || !name || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    db.prepare(`
      INSERT INTO vessels (id, name, type, owner_name, home_port, assigned_node_id, lat, lng, heading, speed, status, battery_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type, owner_name || null, home_port || null, assigned_node_id || null, Number(lat || 0), Number(lng || 0), Number(heading), Number(speed), status, Number(battery_pct));

    const newVessel = db.prepare("SELECT * FROM vessels WHERE id = ?").get(id);
    res.status(201).json(newVessel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/vessels/:id
router.put("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, owner_name, home_port, assigned_node_id, lat, lng, heading, speed, status, battery_pct } = req.body;

    const existing = db.prepare("SELECT * FROM vessels WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ error: "Vessel not found" });
    }

    db.prepare(`
      UPDATE vessels
      SET name = ?, type = ?, owner_name = ?, home_port = ?, assigned_node_id = ?,
          lat = ?, lng = ?, heading = ?, speed = ?, status = ?, battery_pct = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name !== undefined ? name : existing.name,
      type !== undefined ? type : existing.type,
      owner_name !== undefined ? owner_name : existing.owner_name,
      home_port !== undefined ? home_port : existing.home_port,
      assigned_node_id !== undefined ? assigned_node_id : existing.assigned_node_id,
      lat !== undefined ? Number(lat) : existing.lat,
      lng !== undefined ? Number(lng) : existing.lng,
      heading !== undefined ? Number(heading) : existing.heading,
      speed !== undefined ? Number(speed) : existing.speed,
      status !== undefined ? status : existing.status,
      battery_pct !== undefined ? Number(battery_pct) : existing.battery_pct,
      id
    );

    const updated = db.prepare("SELECT * FROM vessels WHERE id = ?").get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vessels/:id
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = db.prepare("DELETE FROM vessels WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Vessel not found" });
    }
    res.json({ success: true, message: `Vessel ${id} deleted.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
