import { create } from "zustand";
import api from "../lib/api";

export interface RelayNode {
  id: string;
  name: string;
  type: "shore" | "buoy" | "vessel";
  location_name: string;
  lat: number;
  lng: number;
  status: "online" | "degraded" | "offline" | "alert";
  signal_strength: number;
  battery_pct: number;
  uptime_pct: number;
  last_ping: string;
  firmware_version: string;
  installed_at: string;
}

interface NodesState {
  nodes: RelayNode[];
  loading: boolean;
  fetchNodes: () => Promise<void>;
  updateNodeStatus: (nodeId: string, status: RelayNode["status"], signalStrength?: number) => void;
  createNode: (node: Partial<RelayNode>) => Promise<void>;
  updateNode: (id: string, node: Partial<RelayNode>) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
}

export const useNodesStore = create<NodesState>((set, get) => ({
  nodes: [],
  loading: false,
  fetchNodes: async () => {
    set({ loading: true });
    try {
      const res = await api.get("/nodes");
      set({ nodes: res.data, loading: false });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },
  updateNodeStatus: (nodeId, status, signalStrength) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              status,
              signal_strength: signalStrength !== undefined ? signalStrength : n.signal_strength,
              last_ping: new Date().toISOString()
            }
          : n
      )
    }));
  },
  createNode: async (nodeData) => {
    await api.post("/nodes", nodeData);
    await get().fetchNodes();
  },
  updateNode: async (id, nodeData) => {
    await api.put(`/nodes/${id}`, nodeData);
    await get().fetchNodes();
  },
  deleteNode: async (id) => {
    await api.delete(`/nodes/${id}`);
    await get().fetchNodes();
  }
}));
