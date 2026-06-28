import { create } from "zustand";
import api from "../lib/api";

export interface Alert {
  id: string;
  vessel_id: string;
  node_id: string;
  type: "CAPSIZE" | "MANUAL_SOS" | "WELFARE_CHECK";
  lat: number;
  lng: number;
  hop_count: number;
  status: "incoming" | "drone_dispatched" | "rescue_en_route" | "resolved" | "false_positive";
  acknowledged: number;
  acknowledged_at?: string;
  drone_id?: string;
  created_at: string;
  updated_at: string;
  critical_level?: "CRITICAL" | "HIGH" | "MEDIUM";
  creation_method?: "AUTO_SENSOR" | "PHYSICAL_BUTTON" | "DEAD_MAN_SWITCH";
}

interface AlertsState {
  alerts: Alert[];
  loading: boolean;
  activeCount: number;
  fetchAlerts: (page?: number, limit?: number) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  refreshAlertsRandom: () => Promise<void>;
  addNewAlert: (alert: Alert) => void;
  updateAlertStatus: (alertId: string, newStatus: Alert["status"], acknowledged?: number) => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  loading: false,
  activeCount: 0,
  fetchAlerts: async (page = 1, limit = 20) => {
    set({ loading: true });
    try {
      const res = await api.get("/alerts", { params: { page, limit } });
      const alerts = res.data.data || res.data; // Handles both paginated and flat lists
      const activeCount = alerts.filter((a: Alert) => ["incoming", "drone_dispatched", "rescue_en_route"].includes(a.status)).length;
      set({ alerts, activeCount, loading: false });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },
  acknowledgeAlert: async (id) => {
    try {
      const res = await api.patch(`/alerts/${id}/acknowledge`);
      set((state) => {
        const updated = state.alerts.map((a) => (a.id === id ? res.data : a));
        return { alerts: updated };
      });
    } catch (err) {
      console.error(err);
    }
  },
  refreshAlertsRandom: async () => {
    set({ loading: true });
    try {
      const res = await api.get("/alerts", { params: { random: "true" } });
      set({ alerts: res.data, loading: false });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },
  addNewAlert: (alert) => {
    set((state) => {
      // Add new alert to the top, keep max 20, count active
      const list = [alert, ...state.alerts].slice(0, 20);
      const activeCount = list.filter((a) => ["incoming", "drone_dispatched", "rescue_en_route"].includes(a.status)).length;
      return { alerts: list, activeCount };
    });
  },
  updateAlertStatus: (alertId, newStatus, acknowledged) => {
    set((state) => {
      const list = state.alerts.map((a) => {
        if (a.id === alertId) {
          // Re-derive critical and creation properties if updating status
          const critical_level = a.type === "CAPSIZE" ? "CRITICAL" : a.type === "MANUAL_SOS" ? "HIGH" : "MEDIUM";
          const creation_method = a.type === "CAPSIZE" ? "AUTO_SENSOR" : a.type === "MANUAL_SOS" ? "PHYSICAL_BUTTON" : "DEAD_MAN_SWITCH";
          return { 
            ...a, 
            status: newStatus,
            acknowledged: acknowledged !== undefined ? acknowledged : a.acknowledged,
            critical_level,
            creation_method
          } as Alert;
        }
        return a;
      });
      const activeCount = list.filter((a) => ["incoming", "drone_dispatched", "rescue_en_route"].includes(a.status)).length;
      return { alerts: list, activeCount };
    });
  }
}));
