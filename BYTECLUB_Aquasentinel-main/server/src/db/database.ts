import fs from "fs";
import path from "path";

const dbPath = path.resolve(__dirname, "../../../maritime.json");

// In-memory data store structure
interface DataStore {
  vessels: any[];
  nodes: any[];
  alerts: any[];
  drone_missions: any[];
  vessel_positions: any[];
  drones: any[];
  network_activity: any[];
  settings: Record<string, any>;
}

let store: DataStore = {
  vessels: [],
  nodes: [],
  alerts: [],
  drone_missions: [],
  vessel_positions: [],
  drones: [],
  network_activity: [],
  settings: {
    capsize_sensitivity: 75,
    welfare_timeout: 4,
    auto_drone_dispatch: true,
    false_positive_cancel_window: 15,
    lora_frequency: 868.1,
    hop_limit: 5,
    gps_broadcast_interval: 30,
    node_offline_threshold: 10,
    notifications_email: "alerts@aquasentinel.gov",
    notifications_sms: true,
    notifications_push: true,
    notifications_sound: true
  }
};

// Load data on start
function loadData() {
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, "utf8");
      const parsed = JSON.parse(raw);
      store = { ...store, ...parsed };
      // Make sure array keys exist
      if (!store.network_activity) store.network_activity = [];
      if (!store.vessel_positions) store.vessel_positions = [];
      if (!store.drone_missions) store.drone_missions = [];
      if (!store.drones) store.drones = [];
      if (!store.alerts) store.alerts = [];
      if (!store.nodes) store.nodes = [];
      if (!store.vessels) store.vessels = [];
    } else {
      saveData();
    }
  } catch (err) {
    console.error("Error reading JSON database, initializing empty:", err);
  }
}

// Save data helper
function saveData() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving JSON database:", err);
  }
}

loadData();

// Helper to get table name from SQL
function getTableName(cleanSql: string): string | null {
  const parts = cleanSql.split(" ");
  const fromIdx = parts.findIndex(p => p.toUpperCase() === "FROM");
  if (fromIdx !== -1 && fromIdx + 1 < parts.length) {
    return parts[fromIdx + 1].replace(/[()]/g, "").trim();
  }
  const updateIdx = parts.findIndex(p => p.toUpperCase() === "UPDATE");
  if (updateIdx !== -1 && updateIdx + 1 < parts.length) {
    return parts[updateIdx + 1].trim();
  }
  const insertIdx = parts.findIndex(p => p.toUpperCase() === "INSERT" || p.toUpperCase() === "REPLACE");
  if (insertIdx !== -1) {
    const intoIdx = parts.findIndex(p => p.toUpperCase() === "INTO");
    if (intoIdx !== -1 && intoIdx + 1 < parts.length) {
      return parts[intoIdx + 1].trim();
    }
  }
  const deleteIdx = parts.findIndex(p => p.toUpperCase() === "DELETE");
  if (deleteIdx !== -1) {
    const fromIdxDel = parts.findIndex(p => p.toUpperCase() === "FROM");
    if (fromIdxDel !== -1 && fromIdxDel + 1 < parts.length) {
      return parts[fromIdxDel + 1].trim();
    }
  }
  return null;
}

// Generic INSERT handler
function executeInsert(tableName: string, sql: string, params: any[]) {
  const cleanSql = sql.trim().replace(/\s+/g, " ");
  
  // Extract columns list from INSERT INTO table (col1, col2)
  const columnsMatch = cleanSql.match(/\(([^)]+)\)/);
  if (!columnsMatch) return { changes: 0 };
  
  const cols = columnsMatch[1].split(",").map(c => c.trim().toLowerCase());
  
  // Extract values part: VALUES (?, ?, ..., datetime(...), ?)
  const valuesPartMatch = cleanSql.slice(cleanSql.toUpperCase().indexOf("VALUES")).match(/\((.+)\)/i);
  if (!valuesPartMatch) return { changes: 0 };
  
  const values = valuesPartMatch[1].split(",").map(v => v.trim());
  const item: any = {
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  let paramIdx = 0;
  cols.forEach((col, idx) => {
    const valExpr = values[idx];
    if (valExpr === "?") {
      let val = params[paramIdx++];
      if (["lat", "lng", "speed", "heading", "battery_pct", "uptime_pct", "signal_strength", "hop_count", "acknowledged", "mission_progress", "eta_minutes"].includes(col)) {
        if (col === "acknowledged") {
          item[col] = val === 1 || val === true || val === "true";
        } else {
          item[col] = val !== null && val !== undefined ? Number(val) : null;
        }
      } else {
        item[col] = val;
      }
    } else if (valExpr.startsWith("'") && valExpr.endsWith("'")) {
      item[col] = valExpr.slice(1, -1);
    } else if (!isNaN(Number(valExpr))) {
      item[col] = Number(valExpr);
    } else if (valExpr.toLowerCase().startsWith("datetime(")) {
      const offsetMatch = valExpr.match(/['"](-?\d+\s+\w+)['"]/);
      if (offsetMatch) {
        const offsetStr = offsetMatch[1]; // e.g. "-2 hours"
        const num = parseInt(offsetStr);
        const unit = offsetStr.includes("hour") ? "hour" : "minute";
        const date = new Date();
        if (unit === "hour") date.setHours(date.getHours() + num);
        else date.setMinutes(date.getMinutes() + num);
        item[col] = date.toISOString();
      } else {
        item[col] = new Date().toISOString();
      }
    } else if (valExpr.toUpperCase() === "CURRENT_TIMESTAMP") {
      item[col] = new Date().toISOString();
    }
  });

  if (tableName === "settings") {
    const key = item.key;
    const value = item.value;
    if (key !== undefined) {
      store.settings[key] = value;
      saveData();
      return { changes: 1, lastInsertRowid: key };
    }
    return { changes: 0 };
  }

  const list = store[tableName as keyof DataStore] as any[];
  if (list) {
    if (tableName === "vessel_positions" || tableName === "network_activity") {
      const maxId = list.reduce((max, x) => Math.max(max, x.id || 0), 0);
      item.id = maxId + 1;
    }
    
    if (item.id) {
      const idx = list.findIndex(x => x.id === item.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item };
        saveData();
        return { changes: 1, lastInsertRowid: item.id };
      }
    }
    
    list.push(item);
    saveData();
    return { changes: 1, lastInsertRowid: item.id || 1 };
  }
  return { changes: 0 };
}

// Generic UPDATE handler
function executeUpdate(tableName: string, sql: string, params: any[]) {
  const cleanSql = sql.trim().replace(/\s+/g, " ");
  
  const setPartMatch = cleanSql.match(/SET\s+(.+?)\s+WHERE/i);
  if (!setPartMatch) return { changes: 0 };
  const setPart = setPartMatch[1];
  
  const wherePartIndex = cleanSql.toUpperCase().indexOf("WHERE ");
  const wherePart = wherePartIndex !== -1 ? cleanSql.slice(wherePartIndex + 6) : "";
  
  const setCols: string[] = [];
  const setValues: Record<string, any> = {};
  const setPairs = setPart.split(",");
  
  let paramIdx = 0;
  setPairs.forEach(pair => {
    const parts = pair.split("=");
    if (parts.length === 2) {
      const col = parts[0].trim();
      const valStr = parts[1].trim();
      if (valStr === "?") {
        setCols.push(col);
        setValues[col] = params[paramIdx++];
      } else if (valStr.startsWith("'") && valStr.endsWith("'")) {
        setValues[col] = valStr.slice(1, -1);
      } else if (!isNaN(Number(valStr))) {
        setValues[col] = Number(valStr);
      } else if (valStr.toUpperCase() === "NULL") {
        setValues[col] = null;
      } else if (valStr.toUpperCase() === "CURRENT_TIMESTAMP") {
        setValues[col] = new Date().toISOString();
      }
    }
  });
  
  const whereCols: string[] = [];
  if (wherePart) {
    const wherePairs = wherePart.split(/\s+AND\s+/i);
    wherePairs.forEach(pair => {
      const parts = pair.split("=");
      if (parts.length === 2 && parts[1].trim() === "?") {
        whereCols.push(parts[0].trim());
      }
    });
  }
  
  const whereValues: Record<string, any> = {};
  whereCols.forEach((col) => {
    whereValues[col] = params[paramIdx++];
  });

  if (tableName === "settings") {
    const key = whereValues.key;
    const value = setValues.value;
    if (key !== undefined && value !== undefined) {
      store.settings[key] = value;
      saveData();
      return { changes: 1 };
    }
    return { changes: 0 };
  }
  
  const list = store[tableName as keyof DataStore] as any[];
  if (!list) return { changes: 0 };
  
  let changes = 0;
  list.forEach(item => {
    let matches = true;
    for (const [col, val] of Object.entries(whereValues)) {
      if (String(item[col]) !== String(val)) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      changes++;
      for (const [col, val] of Object.entries(setValues)) {
        if (["lat", "lng", "speed", "heading", "battery_pct", "uptime_pct", "signal_strength", "hop_count", "acknowledged", "mission_progress", "eta_minutes"].includes(col)) {
          if (col === "acknowledged") {
            item[col] = val === 1 || val === true || val === "true";
          } else {
            item[col] = val !== null && val !== undefined ? Number(val) : null;
          }
        } else {
          item[col] = val;
        }
      }
    }
  });
  
  if (changes > 0) {
    saveData();
  }
  return { changes };
}

// Generic DELETE handler
function executeDelete(tableName: string, sql: string, params: any[]) {
  const cleanSql = sql.trim().replace(/\s+/g, " ");
  const wherePartIndex = cleanSql.toUpperCase().indexOf("WHERE ");
  const wherePart = wherePartIndex !== -1 ? cleanSql.slice(wherePartIndex + 6) : "";
  
  if (cleanSql.includes("WHERE id IN")) {
    const [vessel_id, limit] = params;
    const list = store.vessel_positions.filter(p => p.vessel_id === vessel_id);
    list.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    const deleteIds = new Set(list.slice(0, limit).map(p => p.id));
    
    const originalLength = store.vessel_positions.length;
    store.vessel_positions = store.vessel_positions.filter(p => !deleteIds.has(p.id));
    saveData();
    return { changes: originalLength - store.vessel_positions.length };
  }

  const whereCols: string[] = [];
  if (wherePart) {
    const wherePairs = wherePart.split(/\s+AND\s+/i);
    wherePairs.forEach(pair => {
      const parts = pair.split("=");
      if (parts.length === 2 && parts[1].trim() === "?") {
        whereCols.push(parts[0].trim());
      }
    });
  }
  
  const whereValues: Record<string, any> = {};
  whereCols.forEach((col, idx) => {
    whereValues[col] = params[idx];
  });
  
  const list = store[tableName as keyof DataStore] as any[];
  if (!list) return { changes: 0 };
  
  const originalLength = list.length;
  const filtered = list.filter(item => {
    let matches = true;
    for (const [col, val] of Object.entries(whereValues)) {
      if (String(item[col]) !== String(val)) {
        matches = false;
        break;
      }
    }
    return !matches;
  });
  
  store[tableName as keyof DataStore] = filtered;
  saveData();
  return { changes: originalLength - filtered.length };
}

// Generic SELECT handler
function executeSelect(sql: string, params: any[]) {
  const cleanSql = sql.trim().replace(/\s+/g, " ");
  const upperSql = cleanSql.toUpperCase();
  
  // 1. SELECT value FROM settings WHERE key = ?
  if (upperSql.includes("SELECT VALUE FROM SETTINGS WHERE KEY = ?")) {
    const val = store.settings[params[0]];
    return val !== undefined ? [{ value: String(val) }] : [];
  }

  // 2. SELECT AVG(uptime_pct) as avgUptime FROM nodes
  if (upperSql.includes("SELECT AVG(UPTIME_PCT) AS AVGUPTIME FROM NODES") || upperSql.includes("SELECT AVG(UPTIME_PCT) FROM NODES")) {
    const sum = store.nodes.reduce((acc, n) => acc + (n.uptime_pct || 0), 0);
    const avg = store.nodes.length > 0 ? sum / store.nodes.length : 100.0;
    return [{ avgUptime: avg }];
  }

  // 3. SELECT SUM(messages_relayed) as totalMessages FROM network_activity
  if (upperSql.includes("SELECT SUM(MESSAGES_RELAYED) AS TOTALMESSAGES FROM NETWORK_ACTIVITY") || upperSql.includes("SELECT SUM(MESSAGES_RELAYED) FROM NETWORK_ACTIVITY")) {
    const sum = store.network_activity ? store.network_activity.reduce((acc, n) => acc + (n.messages_relayed || 0), 0) : 2840;
    return [{ totalMessages: sum }];
  }

  // 4. SELECT COUNT(*) as count FROM vessel_positions WHERE vessel_id = ?
  if (upperSql.includes("SELECT COUNT(*) AS COUNT FROM VESSEL_POSITIONS WHERE VESSEL_ID = ?") || upperSql.includes("SELECT COUNT(*) FROM VESSEL_POSITIONS WHERE VESSEL_ID = ?")) {
    const count = store.vessel_positions.filter(p => p.vessel_id === params[0]).length;
    return [{ count }];
  }

  // 5. SELECT COUNT(*) as count FROM vessels
  if (upperSql.includes("SELECT COUNT(*) AS COUNT FROM VESSELS") || upperSql.includes("SELECT COUNT(*) FROM VESSELS")) {
    return [{ count: store.vessels.length }];
  }

  // 6. SELECT COUNT(*) as count FROM nodes WHERE status != 'offline'
  if (upperSql.includes("SELECT COUNT(*) AS COUNT FROM NODES WHERE STATUS != 'OFFLINE'") || upperSql.includes("SELECT COUNT(*) FROM NODES WHERE STATUS != 'OFFLINE'")) {
    const count = store.nodes.filter(n => n.status !== "offline").length;
    return [{ count }];
  }

  // 7. SELECT COUNT(*) as count FROM alerts WHERE status IN ('incoming', 'drone_dispatched', 'rescue_en_route')
  if (upperSql.includes("SELECT COUNT(*) AS COUNT FROM ALERTS WHERE STATUS IN") || upperSql.includes("SELECT COUNT(*) FROM ALERTS WHERE STATUS IN")) {
    const count = store.alerts.filter(a => ["incoming", "drone_dispatched", "rescue_en_route"].includes(a.status)).length;
    return [{ count }];
  }
  if (upperSql.includes("SELECT COUNT(*) AS COUNT FROM ALERTS WHERE STATUS = 'FALSE_POSITIVE'") || upperSql.includes("SELECT COUNT(*) FROM ALERTS WHERE STATUS = 'FALSE_POSITIVE'")) {
    return [{ count: store.alerts.filter(a => a.status === "false_positive").length }];
  }
  if (upperSql.includes("SELECT COUNT(*) AS COUNT FROM ALERTS WHERE STATUS = 'RESOLVED'") || upperSql.includes("SELECT COUNT(*) FROM ALERTS WHERE STATUS = 'RESOLVED'")) {
    return [{ count: store.alerts.filter(a => a.status === "resolved").length }];
  }
  if (upperSql.includes("SELECT COUNT(*) AS COUNT FROM ALERTS") || upperSql.includes("SELECT COUNT(*) FROM ALERTS")) {
    return [{ count: store.alerts.length }];
  }

  // 8. SELECT COUNT(*) as count FROM drones WHERE status = 'deployed'
  if (upperSql.includes("SELECT COUNT(*) AS COUNT FROM DRONES WHERE STATUS = 'DEPLOYED'") || upperSql.includes("SELECT COUNT(*) FROM DRONES WHERE STATUS = 'DEPLOYED'")) {
    return [{ count: store.drones.filter(d => d.status === "deployed").length }];
  }

  // 9. SELECT type, COUNT(*) as count FROM alerts GROUP BY type
  if (upperSql.includes("SELECT TYPE, COUNT(*) AS COUNT FROM ALERTS GROUP BY TYPE") || upperSql.includes("SELECT TYPE, COUNT(*) FROM ALERTS GROUP BY TYPE")) {
    const counts: Record<string, number> = {};
    store.alerts.forEach(a => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }

  // 10. SELECT strftime('%H', created_at) as hr, COUNT(*) as count FROM alerts GROUP BY hr
  if (cleanSql.includes("strftime('%H', created_at) as hr") || cleanSql.includes("strftime('%H', created_at)")) {
    const counts: Record<string, number> = {};
    store.alerts.forEach(a => {
      const date = a.created_at || a.timestamp || new Date().toISOString();
      const hr = String(new Date(date).getHours()).padStart(2, "0");
      counts[hr] = (counts[hr] || 0) + 1;
    });
    return Object.entries(counts).map(([hr, count]) => ({ hr, count }));
  }

  const tableName = getTableName(cleanSql);
  if (!tableName) return [];

  const list = store[tableName as keyof DataStore] as any[];
  if (!list) {
    if (tableName.toLowerCase() === "settings") {
      return Object.entries(store.settings).map(([key, value]) => ({ key, value: String(value) }));
    }
    return [];
  }

  let filtered = [...list];

  // Apply filters
  const whereIndex = upperSql.indexOf(" WHERE ");
  if (whereIndex !== -1) {
    const wherePart = cleanSql.slice(whereIndex + 7).split(/ORDER BY|LIMIT|OFFSET/i)[0].trim();
    
    const conditions: Array<{ col: string; op: "LIKE" | "="; paramIdx: number }> = [];
    let paramIndex = 0;
    
    // Parse literals
    const literalConditions: Array<{ col: string; op: "=" | "!="; val: any }> = [];
    const literalRegex = /(\w+)\s+(=|!=)\s+['"]([^'"]+)['"]/gi;
    let litMatch;
    while ((litMatch = literalRegex.exec(wherePart)) !== null) {
      literalConditions.push({
        col: litMatch[1],
        op: litMatch[2] as "=" | "!=",
        val: litMatch[3]
      });
    }

    // Parse parameters
    const regex = /(\w+)\s+(LIKE|=)\s*\?/gi;
    let match;
    while ((match = regex.exec(wherePart)) !== null) {
      conditions.push({
        col: match[1],
        op: match[2].toUpperCase() as "LIKE" | "=",
        paramIdx: paramIndex++
      });
    }

    filtered = list.filter(item => {
      let matches = true;
      
      for (const cond of literalConditions) {
        const itemVal = item[cond.col];
        if (cond.op === "=") {
          if (String(itemVal) !== String(cond.val)) { matches = false; break; }
        } else {
          if (String(itemVal) === String(cond.val)) { matches = false; break; }
        }
      }
      if (!matches) return false;

      for (const cond of conditions) {
        const val = params[cond.paramIdx];
        const itemVal = item[cond.col];
        if (cond.op === "=") {
          if (String(itemVal) !== String(val)) { matches = false; break; }
        } else if (cond.op === "LIKE") {
          const searchStr = String(val).replace(/%/g, "").toLowerCase();
          if (!String(itemVal).toLowerCase().includes(searchStr)) { matches = false; break; }
        }
      }
      return matches;
    });
  }

  // Handle ORDER BY
  const orderIndex = upperSql.indexOf(" ORDER BY ");
  if (orderIndex !== -1) {
    const orderPart = cleanSql.slice(orderIndex + 10).split(/LIMIT|OFFSET/i)[0].trim();
    if (orderPart.toUpperCase().includes("RANDOM()")) {
      filtered.sort(() => Math.random() - 0.5);
    } else {
      const parts = orderPart.split(/\s+/);
      const col = parts[0];
      const desc = parts[1] && parts[1].toUpperCase() === "DESC";
      filtered.sort((a, b) => {
        let valA = a[col];
        let valB = b[col];
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        if (typeof valA === "string") {
          return desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        } else {
          return desc ? Number(valB) - Number(valA) : Number(valA) - Number(valB);
        }
      });
    }
  }

  // Handle LIMIT and OFFSET
  const limitMatch = cleanSql.match(/LIMIT\s+(\?|\d+)/i);
  const offsetMatch = cleanSql.match(/OFFSET\s+(\?|\d+)/i);
  
  let limit = filtered.length;
  let offset = 0;
  
  if (limitMatch) {
    const val = limitMatch[1];
    if (val === "?") {
      limit = Number(params[params.length - (offsetMatch ? 2 : 1)]);
    } else {
      limit = Number(val);
    }
  }
  
  if (offsetMatch) {
    const val = offsetMatch[1];
    if (val === "?") {
      offset = Number(params[params.length - 1]);
    } else {
      offset = Number(val);
    }
  }

  return filtered.slice(offset, offset + limit);
}

class Statement {
  constructor(private sql: string, private executor: (params: any[]) => any) {}

  run(...params: any[]) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const result = this.executor(flatParams);
    return result || { changes: 1, lastInsertRowid: 1 };
  }

  all(...params: any[]) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const res = this.executor(flatParams);
    return Array.isArray(res) ? res : [res].filter(Boolean);
  }

  get(...params: any[]) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const res = this.executor(flatParams);
    return Array.isArray(res) ? res[0] : res;
  }
}

class MockDatabase {
  exec(sql: string) {
    // Database schema creation completed
  }

  pragma(sql: string) {
    // Database pragmas configured
  }

  transaction(fn: (...args: any[]) => any) {
    return (...args: any[]) => {
      const result = fn(...args);
      saveData();
      return result;
    };
  }

  prepare(sql: string) {
    const cleanSql = sql.trim().replace(/\s+/g, " ");
    const tableName = getTableName(cleanSql);

    if (cleanSql.toUpperCase().startsWith("INSERT") || cleanSql.toUpperCase().startsWith("REPLACE")) {
      return new Statement(sql, (params) => {
        if (tableName) {
          return executeInsert(tableName, sql, params);
        }
        return { changes: 0 };
      });
    }

    if (cleanSql.toUpperCase().startsWith("UPDATE")) {
      return new Statement(sql, (params) => {
        if (tableName) {
          return executeUpdate(tableName, sql, params);
        }
        return { changes: 0 };
      });
    }

    if (cleanSql.toUpperCase().startsWith("DELETE")) {
      return new Statement(sql, (params) => {
        if (tableName) {
          return executeDelete(tableName, sql, params);
        }
        return { changes: 0 };
      });
    }

    // Default: SELECT queries
    return new Statement(sql, (params) => {
      return executeSelect(sql, params);
    });
  }
}

const db = new MockDatabase();
export default db;
