import { create } from "zustand";
import api from "../lib/api";

export interface Drone {
  id: string;
  status: "standby" | "deployed" | "returning" | "maintenance";
  battery_pct: number;
  mission_progress: number;
  eta_minutes: number;
  target_vessel_id: string | null;
  current_lat: number;
  current_lng: number;
  home_lat: number;
  home_lng: number;
}

export interface Mission {
  id: string;
  drone_id: string;
  alert_id: string;
  target_vessel_id: string;
  dispatch_time: string;
  arrival_time: string | null;
  return_time: string | null;
  duration_minutes: number | null;
  outcome: "SUCCESS" | "ABORTED" | "IN_PROGRESS";
  notes?: string;
}

interface DronesState {
  drones: Drone[];
  missions: Mission[];
  loading: boolean;
  flightAnimation: {
    active: boolean;
    droneId: string;
    targetScreenPos: { x: number; y: number } | null;
  };
  fetchDrones: () => Promise<void>;
  fetchMissions: () => Promise<void>;
  deployDrone: (droneId: string, alertId: string, targetVesselId: string) => Promise<any>;
  returnDrone: (droneId: string) => Promise<void>;
  updateDroneState: (droneId: string, updates: Partial<Drone>) => void;
  triggerFlightAnimation: (droneId: string, pos: { x: number; y: number }) => void;
  endFlightAnimation: () => void;
}

export const useDronesStore = create<DronesState>((set, get) => ({
  drones: [],
  missions: [],
  loading: false,
  flightAnimation: {
    active: false,
    droneId: "",
    targetScreenPos: null
  },
  fetchDrones: async () => {
    set({ loading: true });
    try {
      const res = await api.get("/drones");
      set({ drones: res.data, loading: false });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },
  fetchMissions: async () => {
    try {
      const res = await api.get("/drones/missions");
      set({ missions: res.data });
    } catch (err) {
      console.error(err);
    }
  },
  deployDrone: async (droneId, alertId, targetVesselId) => {
    const res = await api.post(`/drones/${droneId}/deploy`, { alertId, targetVesselId });
    await get().fetchDrones();
    await get().fetchMissions();
    return res.data;
  },
  returnDrone: async (droneId) => {
    await api.post(`/drones/${droneId}/return`);
    await get().fetchDrones();
    await get().fetchMissions();
  },
  updateDroneState: (droneId, updates) => {
    set((state) => ({
      drones: state.drones.map((d) => (d.id === droneId ? { ...d, ...updates } : d))
    }));
  },
  triggerFlightAnimation: (droneId, pos) => {
    set({
      flightAnimation: {
        active: true,
        droneId,
        targetScreenPos: pos
      }
    });
  },
  endFlightAnimation: () => {
    set({
      flightAnimation: {
        active: false,
        droneId: "",
        targetScreenPos: null
      }
    });
  }
}));
