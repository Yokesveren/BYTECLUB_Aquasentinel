import { create } from "zustand";
import api from "../lib/api";

export interface Vessel {
  id: string;
  name: string;
  type: "FISHING" | "COMMUTE" | "SECURITY";
  owner_name: string;
  home_port: string;
  assigned_node_id: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  status: "online" | "alert" | "degraded" | "offline";
  battery_pct: number;
}

interface VesselsState {
  vessels: Vessel[];
  loading: boolean;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  filters: {
    search: string;
    type: string;
    status: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
  };
  setFilters: (filters: Partial<VesselsState["filters"]>) => void;
  fetchVessels: (page?: number, limit?: number) => Promise<void>;
  updateVesselPosition: (update: { vesselId: string; lat: number; lng: number; heading: number; speed: number; status?: string }) => void;
  createVessel: (vessel: Partial<Vessel>) => Promise<void>;
  updateVessel: (id: string, vessel: Partial<Vessel>) => Promise<void>;
  deleteVessel: (id: string) => Promise<void>;
}

export const useVesselsStore = create<VesselsState>((set, get) => ({
  vessels: [],
  loading: false,
  pagination: { total: 0, page: 1, limit: 10, pages: 0 },
  filters: {
    search: "",
    type: "All",
    status: "All",
    sortBy: "id",
    sortOrder: "asc"
  },
  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
  },
  fetchVessels: async (page = 1, limit = 10) => {
    set({ loading: true });
    try {
      const { search, type, status, sortBy, sortOrder } = get().filters;
      const res = await api.get("/vessels", {
        params: { page, limit, search, type, status, sortBy, sortOrder }
      });
      set({
        vessels: res.data.data,
        pagination: res.data.pagination,
        loading: false
      });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },
  updateVesselPosition: (update) => {
    set((state) => {
      const updatedVessels = state.vessels.map((v) => {
        if (v.id === update.vesselId) {
          return {
            ...v,
            lat: update.lat,
            lng: update.lng,
            heading: update.heading,
            speed: update.speed,
            status: (update.status as any) || v.status
          };
        }
        return v;
      });
      return { vessels: updatedVessels };
    });
  },
  createVessel: async (vesselData) => {
    await api.post("/vessels", vesselData);
    await get().fetchVessels(get().pagination.page, get().pagination.limit);
  },
  updateVessel: async (id, vesselData) => {
    await api.put(`/vessels/${id}`, vesselData);
    await get().fetchVessels(get().pagination.page, get().pagination.limit);
  },
  deleteVessel: async (id) => {
    await api.delete(`/vessels/${id}`);
    await get().fetchVessels(get().pagination.page, get().pagination.limit);
  }
}));
