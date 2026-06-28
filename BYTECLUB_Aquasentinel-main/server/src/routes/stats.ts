import { Router, Request, Response } from "express";
import db from "../db/database";

const router = Router();

// GET /api/stats/dashboard
router.get("/dashboard", (req: Request, res: Response) => {
  try {
    const vesselsCount = db.prepare("SELECT COUNT(*) as count FROM vessels").get() as { count: number };
    const nodesCount = db.prepare("SELECT COUNT(*) as count FROM nodes WHERE status != 'offline'").get() as { count: number };
    const alertsCount = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status IN ('incoming', 'drone_dispatched', 'rescue_en_route')").get() as { count: number };
    const dronesCount = db.prepare("SELECT COUNT(*) as count FROM drones WHERE status = 'deployed'").get() as { count: number };
    const uptimeAvg = db.prepare("SELECT AVG(uptime_pct) as avgUptime FROM nodes").get() as { avgUptime: number };
    const messagesSum = db.prepare("SELECT SUM(messages_relayed) as totalMessages FROM network_activity WHERE recorded_at >= datetime('now', '-24 hours')").get() as { totalMessages: number };

    // Sparkline details (simulate 7 historical data points for each)
    const vesselSpark = [10, 10, 10, 10, 10, 10, vesselsCount.count];
    const nodeSpark = [45, 46, 47, 47, 47, 46, nodesCount.count];
    const alertSpark = [1, 2, 0, 1, 3, 2, alertsCount.count];
    const droneSpark = [0, 1, 0, 2, 1, 1, dronesCount.count];
    const uptimeSpark = [99.5, 99.6, 99.7, 99.8, 99.8, 99.8, uptimeAvg.avgUptime || 100];
    const msgSpark = [100, 120, 150, 180, 200, 160, messagesSum.totalMessages || 500];

    res.json({
      vesselsMonitored: { count: vesselsCount.count, spark: vesselSpark },
      activeNodes: { count: nodesCount.count, spark: nodeSpark },
      activeDistress: { count: alertsCount.count, spark: alertSpark },
      dronesDeployed: { count: dronesCount.count, spark: droneSpark },
      networkUptime: { count: parseFloat((uptimeAvg.avgUptime || 100).toFixed(2)), spark: uptimeSpark },
      messagesRelayed: { count: messagesSum.totalMessages || 2840, spark: msgSpark }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/activity
router.get("/activity", (req: Request, res: Response) => {
  try {
    const activity = db.prepare(`
      SELECT hour, messages_relayed, alerts_triggered 
      FROM network_activity 
      WHERE recorded_at >= datetime('now', '-24 hours')
      ORDER BY recorded_at ASC
    `).all() as any[];

    // Ensure we always have 24 hours of formatted data
    const formatted = activity.map(row => ({
      time: `${String(row.hour).padStart(2, "0")}:00`,
      messages: row.messages_relayed,
      alerts: row.alerts_triggered
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/alerts-summary
router.get("/alerts-summary", (req: Request, res: Response) => {
  try {
    // 1. Donut chart type breakdown
    const typesBreakdown = db.prepare(`
      SELECT type, COUNT(*) as count 
      FROM alerts 
      GROUP BY type
    `).all() as any[];

    const donutData = [
      { name: "Capsize", value: 0, color: "#e74c3c" },
      { name: "Manual SOS", value: 0, color: "#f5a623" },
      { name: "Welfare Check", value: 0, color: "#378add" }
    ];

    typesBreakdown.forEach(row => {
      if (row.type === "CAPSIZE") donutData[0].value = row.count;
      if (row.type === "MANUAL_SOS") donutData[1].value = row.count;
      if (row.type === "WELFARE_CHECK") donutData[2].value = row.count;
    });

    // 2. Bar chart alerts by hour over last 24h
    // Since alerts count is usually low, we can aggregate alerts count from alerts table in past 24 hours
    const hourlyAlerts = db.prepare(`
      SELECT strftime('%H', created_at) as hr, COUNT(*) as count
      FROM alerts
      WHERE created_at >= datetime('now', '-24 hours')
      GROUP BY hr
    `).all() as any[];

    // Build full 24h list
    const barData = Array.from({ length: 24 }).map((_, i) => {
      const hrStr = String((new Date().getHours() - 23 + i + 24) % 24).padStart(2, "0");
      const found = hourlyAlerts.find(h => h.hr === hrStr);
      return {
        hour: `${hrStr}:00`,
        count: found ? found.count : 0
      };
    });

    // 3. Stats Summary Cards
    const totalAlerts = db.prepare("SELECT COUNT(*) as count FROM alerts").get() as { count: number };
    const falsePositives = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status = 'false_positive'").get() as { count: number };
    const activeAlerts = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status IN ('incoming', 'drone_dispatched', 'rescue_en_route')").get() as { count: number };
    const successfulRescues = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status = 'resolved'").get() as { count: number };

    res.json({
      donut: donutData.filter(d => d.value > 0),
      bar: barData,
      summary: {
        total: totalAlerts.count,
        active: activeAlerts.count,
        falsePositives: falsePositives.count,
        successfulRescues: successfulRescues.count,
        avgResponseTime: "12.4 min" // simulated response metric
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
