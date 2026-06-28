import { create } from "zustand";
import api from "../lib/api";

interface StatItem {
  count: number;
  spark: number[];
}

export interface DashboardStats {
  vesselsMonitored: StatItem;
  activeNodes: StatItem;
  activeDistress: StatItem;
  dronesDeployed: StatItem;
  networkUptime: StatItem;
  messagesRelayed: StatItem;
}

interface StatsState {
  stats: DashboardStats | null;
  activity: any[];
  alertsSummary: any;
  loading: boolean;
  fetchDashboardStats: () => Promise<void>;
  fetchActivityStats: () => Promise<void>;
  fetchAlertsSummary: () => Promise<void>;
  updateLiveCounts: (counts: { vesselsCount: number; nodesCount: number; alertsCount: number; dronesCount: number }) => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  stats: null,
  activity: [],
  alertsSummary: null,
  loading: false,
  fetchDashboardStats: async () => {
    set({ loading: true });
    try {
      const res = await api.get("/stats/dashboard");
      set({ stats: res.data, loading: false });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },
  fetchActivityStats: async () => {
    try {
      const res = await api.get("/stats/activity");
      set({ activity: res.data });
    } catch (err) {
      console.error(err);
    }
  },
  fetchAlertsSummary: async () => {
    try {
      const res = await api.get("/stats/alerts-summary");
      set({ alertsSummary: res.data });
    } catch (err) {
      console.error(err);
    }
  },
  updateLiveCounts: (counts) => {
    set((state) => {
      if (!state.stats) return {};
      return {
        stats: {
          ...state.stats,
          vesselsMonitored: {
            ...state.stats.vesselsMonitored,
            count: counts.vesselsCount
          },
          activeNodes: {
            ...state.stats.activeNodes,
            count: counts.nodesCount
          },
          activeDistress: {
            ...state.stats.activeDistress,
            count: counts.alertsCount
          },
          dronesDeployed: {
            ...state.stats.dronesDeployed,
            count: counts.dronesCount
          }
        }
      };
    });
  }
}));
