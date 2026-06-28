import React, { useEffect, useState } from "react";
import { useStatsStore } from "../store/statsStore";
import { useAlertsStore, Alert } from "../store/alertsStore";
import { useNodesStore, RelayNode } from "../store/nodesStore";
import { useDronesStore } from "../store/dronesStore";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { AreaChart } from "../components/charts/AreaChart";
import { Node3DInspectorModal } from "../components/ui/Node3DInspectorModal";
import { DroneDeployModal } from "../components/ui/DroneDeployModal";
import { Modal } from "../components/ui/Modal";
import { useNavigate } from "react-router-dom";
import {
  Ship,
  Radio,
  AlertTriangle,
  Navigation,
  Activity,
  MessageSquare,
  ArrowRight,
  Battery,
  ShieldAlert
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Stores
  const { stats, activity, fetchDashboardStats, fetchActivityStats } = useStatsStore();
  const { alerts, fetchAlerts } = useAlertsStore();
  const { nodes, fetchNodes } = useNodesStore();
  const { drones, fetchDrones, fetchMissions } = useDronesStore();

  // Dialog / Modals State
  const [selectedNode, setSelectedNode] = useState<RelayNode | null>(null);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);

  const [selectedDroneId, setSelectedDroneId] = useState<string>("");
  const [deployModalOpen, setDeployModalOpen] = useState(false);

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchActivityStats();
    fetchAlerts(1, 10);
    fetchNodes();
    fetchDrones();
    fetchMissions();
  }, []);

  const handleNodeClick = (node: RelayNode) => {
    setSelectedNode(node);
    setNodeModalOpen(true);
  };

  const handleDeployClick = (droneId: string) => {
    setSelectedDroneId(droneId);
    setDeployModalOpen(true);
  };

  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setAlertModalOpen(true);
  };

  const getAlertStatusBadge = (status: string) => {
    const map = {
      incoming: "red",
      drone_dispatched: "amber",
      rescue_en_route: "blue",
      resolved: "teal",
      false_positive: "gray"
    } as const;
    return <Badge variant={map[status as keyof typeof map]}>{status.replace("_", " ")}</Badge>;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-text-primary">
            OPERATIONS DASHBOARD
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-1">AQUA-SENTINEL SECURE NETWORK COMMAND NODE</p>
        </div>
      </div>

      {/* ROW 1: Stat Cards Grid */}
      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard
            title="Vessels Monitored"
            value={stats.vesselsMonitored.count}
            icon={Ship}
            color="teal"
            spark={stats.vesselsMonitored.spark}
          />
          <StatCard
            title="Active Nodes"
            value={stats.activeNodes.count}
            icon={Radio}
            color="blue"
            spark={stats.activeNodes.spark}
          />
          <StatCard
            title="Distress Alerts"
            value={stats.activeDistress.count}
            icon={AlertTriangle}
            color="red"
            spark={stats.activeDistress.spark}
          />
          <StatCard
            title="Drones Deployed"
            value={stats.dronesDeployed.count}
            icon={Navigation}
            color="amber"
            spark={stats.dronesDeployed.spark}
          />
          <StatCard
            title="Network Uptime"
            value={stats.networkUptime.count}
            icon={Activity}
            color="teal"
            spark={stats.networkUptime.spark}
          />
          <StatCard
            title="Relayed Messages"
            value={stats.messagesRelayed.count}
            icon={MessageSquare}
            color="blue"
            spark={stats.messagesRelayed.spark}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-36 bg-border-color/10 border border-border-color rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ROW 2: Main Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left 40%: Recent Alerts */}
        <div className="lg:col-span-4 panel-glass p-5 flex flex-col h-[400px]">
          <div className="flex justify-between items-center border-b border-border-color pb-3 mb-4">
            <h3 className="font-display font-bold text-text-primary text-sm tracking-wider uppercase flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-accent-red" />
              Recent Distress Signals
            </h3>
            <button
              onClick={() => navigate("/alerts")}
              className="text-[11px] font-mono text-accent-teal hover:underline flex items-center gap-1"
            >
              VIEW FEED <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {alerts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-text-muted italic">
                No active distress alerts.
              </div>
            ) : (
              alerts.slice(0, 10).map((alert: Alert) => (
                <div
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className="flex items-center justify-between p-3 rounded-lg border border-border-color/30 bg-bg-card/30 hover:bg-border-color/20 cursor-pointer transition-colors font-mono text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">{alert.vessel_id}</span>
                      <Badge variant={alert.type === "CAPSIZE" ? "red" : alert.type === "MANUAL_SOS" ? "amber" : "blue"}>
                        {alert.type}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-text-secondary">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {getAlertStatusBadge(alert.status)}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center 30%: Node Health Overview */}
        <div className="lg:col-span-3 panel-glass p-5 flex flex-col h-[400px]">
          <div className="border-b border-border-color pb-3 mb-4">
            <h3 className="font-display font-bold text-text-primary text-sm tracking-wider uppercase">
              Relay Node Monitor
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {nodes.slice(0, 8).map((node: RelayNode) => (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node)}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border-color/20 bg-bg-card/20 hover:bg-border-color/10 cursor-pointer transition-colors font-mono text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      node.status === "online"
                        ? "bg-accent-teal pulse-teal-dot"
                        : node.status === "degraded"
                        ? "bg-accent-amber pulse-amber-dot"
                        : "bg-text-muted"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-text-primary">{node.id}</div>
                    <div className="text-[9px] text-text-secondary">{node.type.toUpperCase()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-text-secondary">Sig: {node.signal_strength}/5</span>
                  <div className="text-[9px] text-text-muted">
                    {new Date(node.last_ping).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 30%: Drone Fleet Status */}
        <div className="lg:col-span-3 panel-glass p-5 flex flex-col h-[400px]">
          <div className="border-b border-border-color pb-3 mb-4">
            <h3 className="font-display font-bold text-text-primary text-sm tracking-wider uppercase">
              Emergency Drone Fleet
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4">
            {drones.map((drone: any) => (
              <div
                key={drone.id}
                className="p-4 rounded-xl border border-border-color bg-bg-card/45 font-mono text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-text-primary">{drone.id}</span>
                    <span className="ml-2 text-[10px] uppercase text-text-secondary">{drone.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <Battery className="h-3.5 w-3.5 text-text-secondary" />
                    <span className="font-bold text-text-primary">{drone.battery_pct}%</span>
                  </div>
                </div>

                {drone.status === "deployed" ? (
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between text-accent-red font-semibold">
                      <span>DEPLOYED TO distress</span>
                      <span>ETA {drone.eta_minutes}m</span>
                    </div>
                    <div className="w-full bg-border-color h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-teal" style={{ width: `${drone.mission_progress}%` }} />
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="warning"
                    size="sm"
                    className="w-full py-1 text-[11px]"
                    onClick={() => handleDeployClick(drone.id)}
                    disabled={drone.status !== "standby"}
                  >
                    DEPLOY DRONE
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 3: Full-width Area Chart */}
      <div className="panel-glass p-5">
        <h3 className="font-display font-bold text-text-primary text-sm tracking-wider uppercase mb-4">
          Network Data Rate (Messages Relayed / 24 Hours)
        </h3>
        <div className="h-60">
          <AreaChart data={activity} />
        </div>
      </div>

      {/* Modals and Overlays */}
      <Node3DInspectorModal
        isOpen={nodeModalOpen}
        onClose={() => setNodeModalOpen(false)}
        node={selectedNode}
        onViewOnMap={() => navigate("/map")}
      />

      <DroneDeployModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        droneId={selectedDroneId}
      />

      {/* Recent Alert Telemetry Modal */}
      <Modal
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        title="DISTRESS TELEMETRY INSPECTOR"
      >
        {selectedAlert && (
          <div className="font-mono text-xs space-y-4">
            <div className="flex justify-between border-b border-border-color pb-2">
              <span className="font-bold text-text-primary">Vessel ID: {selectedAlert.vessel_id}</span>
              {getAlertStatusBadge(selectedAlert.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-text-secondary block">ALERT TYPE</span>
                <span className="text-text-primary font-bold">{selectedAlert.type}</span>
              </div>
              <div>
                <span className="text-text-secondary block">MESH HOPS</span>
                <span className="text-text-primary font-bold">{selectedAlert.hop_count}</span>
              </div>
              <div>
                <span className="text-text-secondary block">LATITUDE</span>
                <span className="text-text-primary">{selectedAlert.lat.toFixed(5)}</span>
              </div>
              <div>
                <span className="text-text-secondary block">LONGITUDE</span>
                <span className="text-text-primary">{selectedAlert.lng.toFixed(5)}</span>
              </div>
              <div>
                <span className="text-text-secondary block">TRIGGER TIME</span>
                <span className="text-text-primary">{new Date(selectedAlert.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-text-secondary block">DRONE ASSIGNED</span>
                <span className="text-text-primary">{selectedAlert.drone_id || "None"}</span>
              </div>
            </div>
            <div className="border-t border-border-color pt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAlertModalOpen(false)}>
                CLOSE
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setAlertModalOpen(false);
                  navigate("/map");
                }}
              >
                LOCATE ON MAP
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default Dashboard;
