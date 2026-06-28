import { Router, Request, Response } from "express";
import db from "../db/database";

const router = Router();

// GET /api/settings
router.get("/", (req: Request, res: Response) => {
  try {
    const settings = db.prepare("SELECT * FROM settings").all() as any[];
    
    // Convert array of key/value to a single object
    const config: Record<string, any> = {};
    settings.forEach(s => {
      // Cast boolean strings and numbers if appropriate
      if (s.value === "true") config[s.key] = true;
      else if (s.value === "false") config[s.key] = false;
      else if (!isNaN(Number(s.value)) && s.value.trim() !== "") config[s.key] = Number(s.value);
      else config[s.key] = s.value;
    });

    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/settings
router.patch("/", (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    const insertSetting = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);

    db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        insertSetting.run(key, String(value));
      }
    })();

    // Fetch updated config
    const settings = db.prepare("SELECT * FROM settings").all() as any[];
    const config: Record<string, any> = {};
    settings.forEach(s => {
      if (s.value === "true") config[s.key] = true;
      else if (s.value === "false") config[s.key] = false;
      else if (!isNaN(Number(s.value)) && s.value.trim() !== "") config[s.key] = Number(s.value);
      else config[s.key] = s.value;
    });

    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
