import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Toaster } from "react-hot-toast";

// Stores
import { useVesselsStore } from "./store/vesselsStore";
import { useAlertsStore } from "./store/alertsStore";
import { useDronesStore } from "./store/dronesStore";
import { useNodesStore } from "./store/nodesStore";
import { useStatsStore } from "./store/statsStore";

// Components
import { PageWrapper } from "./components/layout/PageWrapper";
import { CinematicBackground } from "./components/ui/CinematicBackground";
import { DroneFlightCanvas } from "./components/ui/DroneFlightCanvas";

// Pages
import Dashboard from "./pages/Dashboard";
import LiveMap from "./pages/LiveMap";
import GlobeView from "./pages/GlobeView";
import DistressFeed from "./pages/DistressFeed";
import FleetManager from "./pages/FleetManager";
import DroneControl from "./pages/DroneControl";
import NodeNetwork from "./pages/NodeNetwork";
import Settings from "./pages/Settings";

export const App: React.FC = () => {
  const updateVesselPosition = useVesselsStore((state) => state.updateVesselPosition);
  const fetchVessels = useVesselsStore((state) => state.fetchVessels);
  const addNewAlert = useAlertsStore((state) => state.addNewAlert);
  const updateAlertStatus = useAlertsStore((state) => state.updateAlertStatus);
  const updateDroneState = useDronesStore((state) => state.updateDroneState);
  const fetchMissions = useDronesStore((state) => state.fetchMissions);
  const updateNodeStatus = useNodesStore((state) => state.updateNodeStatus);
  const updateLiveCounts = useStatsStore((state) => state.updateLiveCounts);

  useEffect(() => {
    // Establish connection to Express Socket.io server
    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3001");

    socket.on("connect", () => {
      console.log("Connected to Socket.io mesh network server.");
    });

    socket.on("vessel:update", (data) => {
      updateVesselPosition(data);
    });

    socket.on("alert:new", (data) => {
      addNewAlert(data);
      // Fetch updated counts
      fetchVessels();
    });

    socket.on("alert:status-change", (data) => {
      updateAlertStatus(data.alertId, data.newStatus, data.acknowledged);
      fetchVessels();
      fetchMissions();
    });

    socket.on("drone:update", (data) => {
      updateDroneState(data.droneId, {
        status: data.status,
        mission_progress: data.progress,
        eta_minutes: data.eta,
        target_vessel_id: data.targetVesselId
      });
    });

    socket.on("node:status-change", (data) => {
      updateNodeStatus(data.nodeId, data.status, data.signalStrength);
    });

    socket.on("stats:update", (data) => {
      updateLiveCounts(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(9, 18, 35, 0.95)",
            color: "#e8edf5",
            border: "1px solid #1a2d45",
            fontFamily: "monospace",
            fontSize: "12px"
          }
        }}
      />
      
      {/* Cinematic Animated Backdrop */}
      <CinematicBackground />

      {/* Drone Intercept Flight Animation Overlay */}
      <DroneFlightCanvas />

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="/map" element={<PageWrapper><LiveMap /></PageWrapper>} />
        <Route path="/globe" element={<PageWrapper><GlobeView /></PageWrapper>} />
        <Route path="/alerts" element={<PageWrapper><DistressFeed /></PageWrapper>} />
        <Route path="/fleet" element={<PageWrapper><FleetManager /></PageWrapper>} />
        <Route path="/drones" element={<PageWrapper><DroneControl /></PageWrapper>} />
        <Route path="/network" element={<PageWrapper><NodeNetwork /></PageWrapper>} />
        <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};
export default App;
