import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useVesselsStore } from "../../store/vesselsStore";
import { useAlertsStore } from "../../store/alertsStore";
import { useNodesStore } from "../../store/nodesStore";
import api from "../../lib/api";
import { Button } from "../ui/Button";

interface LeafletMapProps {
  mode?: "live" | "radar";
  selectedVesselId?: string | null;
  onVesselSelect?: (vesselId: string) => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  mode = "live",
  selectedVesselId = null,
  onVesselSelect
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Global Stores
  const vessels = useVesselsStore((state) => state.vessels);
  const fetchVessels = useVesselsStore((state) => state.fetchVessels);
  const alerts = useAlertsStore((state) => state.alerts);
  const nodes = useNodesStore((state) => state.nodes);

  // Local state for Map overlay controls
  const [filterVessels, setFilterVessels] = useState(true);
  const [filterBuoys, setFilterBuoys] = useState(true);
  const [filterGateways, setFilterGateways] = useState(true);
  const [filterTrails, setFilterTrails] = useState(true);

  // Active track / history paths
  const [followModeId, setFollowModeId] = useState<string | null>(null);
  const [historyPolyline, setHistoryPolyline] = useState<L.Polyline | null>(null);

  // References for leaflet objects to update dynamically
  const vesselMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const nodeMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const trailLinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const relayLinesRef = useRef<L.Polyline[]>([]);

  // Initialize Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Center of Bay of Bengal
    const map = L.map(container, {
      center: [12.0, 82.0],
      zoom: 6,
      zoomControl: false // use custom controls
    });
    mapRef.current = map;

    // Dark Tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
    }).addTo(map);

    // Escape exits follow mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFollowModeId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync follow mode / centering
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !followModeId) return;

    const vessel = vessels.find((v) => v.id === followModeId);
    if (vessel) {
      map.panTo([vessel.lat, vessel.lng]);
    }
  }, [vessels, followModeId]);

  // Sync outer selectedVesselId (e.g. from Fleet Manager table row click)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVesselId) return;

    const vessel = vessels.find((v) => v.id === selectedVesselId);
    if (vessel) {
      map.flyTo([vessel.lat, vessel.lng], 8);
      // Open popup
      const marker = vesselMarkersRef.current.get(selectedVesselId);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedVesselId]);

  // Render & Update Vessels on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Color mapper
    const statusColors = {
      online: "#378add",   // Blue
      alert: "#e74c3c",    // Red
      degraded: "#f5a623", // Amber
      offline: "#4a6a8a"   // Gray
    };

    if (!filterVessels) {
      // Remove all vessel markers and trails
      vesselMarkersRef.current.forEach((m) => m.remove());
      vesselMarkersRef.current.clear();
      trailLinesRef.current.forEach((t) => t.remove());
      trailLinesRef.current.clear();
      return;
    }

    vessels.forEach((vessel) => {
      const color = statusColors[vessel.status];
      const position: [number, number] = [vessel.lat, vessel.lng];

      // Custom DivIcon
      let iconHtml = "";
      if (mode === "radar") {
        // Top-down rotated ship SVG
        iconHtml = `
          <div class="vessel-marker flex flex-col items-center justify-center relative" style="transform: rotate(${vessel.heading}deg); transition: transform 0.2s;">
            <svg width="28" height="28" viewBox="0 0 28 28">
              <!-- Ship top-down view SVG -->
              <ellipse cx="14" cy="14" rx="5" ry="9" fill="${color}" opacity="0.9"/>
              <polygon points="14,2 10,7 18,7" fill="${color}"/>
              <rect x="11" y="19" width="6" height="3" fill="${color}" opacity="0.6"/>
            </svg>
            ${vessel.status === "alert" ? '<div class="alert-ring"></div>' : ""}
          </div>
          <div class="vessel-label absolute top-7 left-1/2 -translate-x-1/2 font-mono text-[9px] text-text-primary bg-bg-deep/80 px-1 border border-border-color rounded select-none pointer-events-none">${vessel.id}</div>
        `;
      } else {
        // Standard circle SVG
        iconHtml = `
          <div class="relative flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <circle cx="9" cy="9" r="6" fill="${color}" stroke="#07101f" stroke-width="2" />
            </svg>
            ${vessel.status === "alert" ? '<div class="alert-ring"></div>' : ""}
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: "custom-vessel-leaflet-icon",
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      let marker = vesselMarkersRef.current.get(vessel.id);

      if (!marker) {
        marker = L.marker(position, { icon: customIcon }).addTo(map);
        vesselMarkersRef.current.set(vessel.id, marker);

        // Click actions
        marker.on("click", () => {
          if (onVesselSelect) {
            onVesselSelect(vessel.id);
          }
          // Highlight table row logic (via callback)
        });
      } else {
        marker.setLatLng(position);
        marker.setIcon(customIcon);
      }

      // Bind custom popup
      const popupContent = document.createElement("div");
      popupContent.className = "p-4 text-xs font-mono text-text-primary space-y-2 bg-bg-panel border border-border-color rounded-xl w-[260px] shadow-2xl";
      popupContent.innerHTML = `
        <div class="flex items-center justify-between border-b border-border-color pb-1.5 mb-1.5">
          <span class="font-bold text-accent-teal">${vessel.name} (${vessel.id})</span>
          <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
            vessel.status === "online"
              ? "bg-accent-teal/10 text-accent-teal border-accent-teal/20"
              : vessel.status === "alert"
              ? "bg-accent-red/10 text-accent-red border-accent-red/20"
              : "bg-accent-amber/10 text-accent-amber border-accent-amber/20"
          }">${vessel.status}</span>
        </div>
        <div class="space-y-1">
          <div><span class="text-text-secondary">Type:</span> ${vessel.type}</div>
          <div><span class="text-text-secondary">Speed:</span> ${vessel.speed.toFixed(1)} knots</div>
          <div><span class="text-text-secondary">Heading:</span> ${Math.floor(vessel.heading)}°</div>
          <div><span class="text-text-secondary">GPS:</span> ${vessel.lat.toFixed(4)}, ${vessel.lng.toFixed(4)}</div>
          <div><span class="text-text-secondary">Assigned Node:</span> ${vessel.assigned_node_id || "None"}</div>
          <div><span class="text-text-secondary">Battery:</span> ${vessel.battery_pct}%</div>
        </div>
        <div class="border-t border-border-color pt-2 mt-2 flex gap-1.5 justify-between">
          <button id="track-btn-${vessel.id}" class="flex-1 bg-accent-teal/20 hover:bg-accent-teal text-accent-teal hover:text-bg-deep text-[10px] font-semibold py-1 rounded border border-accent-teal/30 transition-colors">TRACK</button>
          <button id="history-btn-${vessel.id}" class="flex-1 bg-accent-blue/20 hover:bg-accent-blue text-accent-blue hover:text-text-primary text-[10px] font-semibold py-1 rounded border border-accent-blue/30 transition-colors">HISTORY</button>
          <button id="alert-btn-${vessel.id}" class="flex-1 bg-accent-red/20 hover:bg-accent-red text-accent-red hover:text-text-primary text-[10px] font-semibold py-1 rounded border border-accent-red/30 transition-colors">SOS</button>
        </div>
      `;

      marker.bindPopup(popupContent);

      // Listen for popup open to bind buttons
      marker.on("popupopen", () => {
        const trackBtn = document.getElementById(`track-btn-${vessel.id}`);
        const historyBtn = document.getElementById(`history-btn-${vessel.id}`);
        const alertBtn = document.getElementById(`alert-btn-${vessel.id}`);

        if (trackBtn) {
          trackBtn.onclick = () => {
            setFollowModeId(vessel.id);
            marker?.closePopup();
          };
        }

        if (historyBtn) {
          historyBtn.onclick = async () => {
            try {
              const res = await api.get(`/vessels/${vessel.id}/track`);
              const tracks = res.data as any[];
              if (tracks.length > 0) {
                // Clear old line
                if (historyPolyline) historyPolyline.remove();
                
                const latlngs = tracks.map((t) => [t.lat, t.lng] as [number, number]);
                const poly = L.polyline(latlngs, {
                  color: "#00d4aa",
                  weight: 3,
                  opacity: 0.8
                }).addTo(map);

                setHistoryPolyline(poly);
                map.fitBounds(poly.getBounds());
              }
            } catch (err) {
              console.error(err);
            }
          };
        }

        if (alertBtn) {
          alertBtn.onclick = async () => {
            try {
              // Manually create WELFARE_CHECK alert
              await api.post("/alerts", {
                vessel_id: vessel.id,
                node_id: vessel.assigned_node_id,
                type: "WELFARE_CHECK",
                lat: vessel.lat,
                lng: vessel.lng
              });
              marker?.closePopup();
              fetchVessels(); // refresh status
            } catch (err) {
              console.error(err);
            }
          };
        }
      });

      // Vessel Trails
      if (filterTrails) {
        // Get historical positions from SQLite vessel_positions (We can mock locally if fetching is expensive, 
        // or draw basic trails. Let's create a simple dashed line for last 8 recorded points)
        // Since backend deletes older than 8, let's draw trailing lines connecting positions.
        // We will fetch position track list if trails are enabled or update trails relative to coordinates
        // Let's draw a simple fading polyline for active markers if trailMap exists
      }
    });

    // Cleanup markers that no longer exist
    vesselMarkersRef.current.forEach((m, key) => {
      if (!vessels.find((v) => v.id === key)) {
        m.remove();
        vesselMarkersRef.current.delete(key);
      }
    });
  }, [vessels, filterVessels, filterTrails, mode]);

  // Render & Update Gateway & Buoy Nodes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!filterGateways && !filterBuoys) {
      nodeMarkersRef.current.forEach((m) => m.remove());
      nodeMarkersRef.current.clear();
      return;
    }

    nodes.forEach((node) => {
      if (node.type === "shore" && !filterGateways) {
        const m = nodeMarkersRef.current.get(node.id);
        if (m) { m.remove(); nodeMarkersRef.current.delete(node.id); }
        return;
      }
      if (node.type === "buoy" && !filterBuoys) {
        const m = nodeMarkersRef.current.get(node.id);
        if (m) { m.remove(); nodeMarkersRef.current.delete(node.id); }
        return;
      }

      const position: [number, number] = [node.lat, node.lng];
      let iconHtml = "";

      if (node.type === "shore") {
        // Teal Diamond
        iconHtml = `
          <div class="relative flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 22 22">
              <polygon points="11,2 20,11 11,20 2,11" fill="#378add" stroke="#07101f" stroke-width="2" />
            </svg>
            <div class="absolute inset-0 bg-[#378add]/20 rounded-full animate-ping pointer-events-none"></div>
          </div>
        `;
      } else {
        // Buoy relay: small square
        iconHtml = `
          <div class="relative flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <rect x="2" y="2" width="10" height="10" fill="#00d4aa" stroke="#07101f" stroke-width="1.5" />
            </svg>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: "custom-node-leaflet-icon",
        html: iconHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      let marker = nodeMarkersRef.current.get(node.id);
      if (!marker) {
        marker = L.marker(position, { icon: customIcon }).addTo(map);
        nodeMarkersRef.current.set(node.id, marker);
      } else {
        marker.setLatLng(position);
        marker.setIcon(customIcon);
      }

      marker.bindPopup(`
        <div class="p-3 text-xs font-mono bg-bg-panel border border-border-color rounded-xl w-[200px] shadow-2xl">
          <div class="font-bold text-accent-teal border-b border-border-color pb-1 mb-1.5">${node.name}</div>
          <div>Type: ${node.type.toUpperCase()}</div>
          <div>Status: ${node.status.toUpperCase()}</div>
          <div>Uptime: ${node.uptime_pct}%</div>
        </div>
      `);
    });
  }, [nodes, filterGateways, filterBuoys]);

  // Distress mesh relay lines (Hop-by-hop paths)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old lines
    relayLinesRef.current.forEach((line) => line.remove());
    relayLinesRef.current = [];

    // Find active alerts
    const activeAlerts = alerts.filter((a) => ["incoming", "drone_dispatched", "rescue_en_route"].includes(a.status));
    
    activeAlerts.forEach((alert) => {
      // Find vessel and node path
      const vessel = vessels.find((v) => v.id === alert.vessel_id);
      if (!vessel) return;

      const pathCoords: [number, number][] = [[vessel.lat, vessel.lng]];

      // Add buoys and gateways to draw hops
      // Find assigned node
      const assignedNode = nodes.find((n) => n.id === vessel.assigned_node_id);
      if (assignedNode) {
        pathCoords.push([assignedNode.lat, assignedNode.lng]);

        // If buoy, draw hop to nearest shore gateway
        if (assignedNode.type === "buoy") {
          const nearestGateway = nodes
            .filter((n) => n.type === "shore")
            .map((n) => ({
              ...n,
              dist: Math.hypot(n.lat - assignedNode.lat, n.lng - assignedNode.lng)
            }))
            .sort((a, b) => a.dist - b.dist)[0];
          
          if (nearestGateway) {
            pathCoords.push([nearestGateway.lat, nearestGateway.lng]);
          }
        }
      }

      // Draw dashed red path for distress relay mesh
      const line = L.polyline(pathCoords, {
        color: "#e74c3c",
        weight: 2.5,
        dashArray: "6, 6",
        opacity: 0.8
      }).addTo(map);

      relayLinesRef.current.push(line);
    });
  }, [alerts, vessels, nodes]);

  // Fit all vessels bounds
  const fitAllVessels = () => {
    const map = mapRef.current;
    if (!map || vessels.length === 0) return;

    const bounds = L.latLngBounds(vessels.map((v) => [v.lat, v.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  };

  return (
    <div className="relative w-full h-full" style={{ minHeight: "100%" }}>
      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

      {/* Map custom controls (Top-Right) */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <div className="flex flex-col bg-bg-panel/90 border border-border-color rounded-lg overflow-hidden backdrop-blur-md shadow-xl">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="w-10 h-10 flex items-center justify-center font-bold text-text-primary hover:text-accent-teal hover:bg-border-color/30 border-b border-border-color transition-colors"
          >
            +
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="w-10 h-10 flex items-center justify-center font-bold text-text-primary hover:text-accent-teal hover:bg-border-color/30 transition-colors"
          >
            -
          </button>
        </div>

        <Button variant="outline" size="sm" onClick={fitAllVessels} className="shadow-xl bg-bg-panel/90 border-border-color">
          Fit Vessels
        </Button>
      </div>

      {/* Map filters overlay (bottom left overlay) */}
      <div className="absolute bottom-4 left-4 z-[400] bg-bg-panel/90 border border-border-color rounded-xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-2 text-xs font-mono max-w-[280px]">
        <div className="text-text-secondary uppercase text-[10px] tracking-wider border-b border-border-color pb-1.5 font-display font-bold">
          Layer toggles
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-text-primary hover:text-accent-teal transition-colors">
          <input
            type="checkbox"
            checked={filterVessels}
            onChange={(e) => setFilterVessels(e.target.checked)}
            className="accent-accent-teal"
          />
          Vessels Monitored
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-text-primary hover:text-accent-teal transition-colors">
          <input
            type="checkbox"
            checked={filterBuoys}
            onChange={(e) => setFilterBuoys(e.target.checked)}
            className="accent-accent-teal"
          />
          Relay Buoys
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-text-primary hover:text-accent-teal transition-colors">
          <input
            type="checkbox"
            checked={filterGateways}
            onChange={(e) => setFilterGateways(e.target.checked)}
            className="accent-accent-teal"
          />
          Shore Gateways
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-text-primary hover:text-accent-teal transition-colors">
          <input
            type="checkbox"
            checked={filterTrails}
            onChange={(e) => setFilterTrails(e.target.checked)}
            className="accent-accent-teal"
          />
          Show Trails
        </label>
      </div>

      {/* Top Left Status Overlay card */}
      {mode === "live" && (
        <div className="absolute top-4 left-4 z-[400] bg-bg-panel/95 border border-border-color rounded-xl p-4 shadow-xl backdrop-blur-md font-mono text-xs space-y-1.5 min-w-[220px]">
          <div className="font-display font-bold text-text-primary text-[10px] uppercase tracking-wider border-b border-border-color pb-1 mb-1 text-accent-teal">
            VESSEL RADAR
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Monitored:</span>
            <span className="text-text-primary font-bold">{vessels.length} tracked</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Distress Alerts:</span>
            <span className={`font-bold ${alerts.filter(a=>["incoming","drone_dispatched","rescue_en_route"].includes(a.status)).length > 0 ? "text-accent-red font-bold animate-pulse" : "text-text-muted"}`}>
              {alerts.filter(a=>["incoming","drone_dispatched","rescue_en_route"].includes(a.status)).length} active
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-text-secondary border-t border-border-color pt-1.5 mt-1.5">
            <span>Last Updated:</span>
            <span>Just Now</span>
          </div>
        </div>
      )}
    </div>
  );
};
export default LeafletMap;
