import React from "react";
import { Drone, useDronesStore } from "../../store/dronesStore";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { Battery, Navigation, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface DroneCardProps {
  drone: Drone;
  onDeployClick: (droneId: string) => void;
}

export const DroneCard: React.FC<DroneCardProps> = ({ drone, onDeployClick }) => {
  const { returnDrone, missions } = useDronesStore();

  const getBatteryColor = (pct: number) => {
    if (pct > 60) return "bg-accent-teal";
    if (pct > 20) return "bg-accent-amber";
    return "bg-accent-red";
  };

  const getStatusBadge = () => {
    const vars = {
      standby: "teal",
      deployed: "red",
      returning: "amber",
      maintenance: "gray"
    } as const;
    return <Badge variant={vars[drone.status]}>{drone.status}</Badge>;
  };

  const handleReturn = async () => {
    try {
      await returnDrone(drone.id);
      toast.success(`Drone ${drone.id} returning to launch station.`);
    } catch (err) {
      toast.error("Return command failed.");
    }
  };

  const handleDiagnostics = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `Running diagnostics on ${drone.id}...`,
        success: `${drone.id} calibration complete. Systems nominal.`,
        error: "Diagnostics failed"
      }
    );
  };

  // Get last 5 missions
  const droneMissions = missions
    .filter((m) => m.drone_id === drone.id)
    .slice(0, 5);

  return (
    <div className="panel-glass p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold font-mono text-text-primary tracking-wide">{drone.id}</h3>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-text-secondary font-mono">Quad-Rotors Emergency Drone</p>
        </div>

        {/* Battery Indicator */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <Battery className="h-4.5 w-4.5 text-text-secondary" />
          <div className="w-16 bg-border-color h-2.5 rounded-full overflow-hidden flex">
            <div className={`h-full ${getBatteryColor(drone.battery_pct)}`} style={{ width: `${drone.battery_pct}%` }} />
          </div>
          <span className="text-text-primary font-bold">{drone.battery_pct}%</span>
        </div>
      </div>

      {/* Deployed Mission Info */}
      {drone.status === "deployed" ? (
        <div className="bg-bg-deep/50 border border-accent-red/20 rounded-xl p-4 space-y-3 font-mono text-xs animate-pulse">
          <div className="flex justify-between items-center text-accent-red">
            <span className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> INTERCEPTING SOS</span>
            <span>ETA: {drone.eta_minutes} min</span>
          </div>
          <div className="space-y-1 text-text-primary">
            <div><span className="text-text-secondary">Target Vessel:</span> {drone.target_vessel_id}</div>
          </div>

          {/* Mission Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-text-secondary">
              <span>PROGRESS</span>
              <span>{drone.mission_progress}%</span>
            </div>
            <div className="w-full bg-border-color h-2 rounded-full overflow-hidden">
              <div className="h-full bg-accent-teal transition-all duration-1000" style={{ width: `${drone.mission_progress}%` }} />
            </div>
          </div>
        </div>
      ) : drone.status === "returning" ? (
        <div className="bg-bg-deep/50 border border-accent-amber/20 rounded-xl p-4 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center text-accent-amber">
            <span className="flex items-center gap-1.5"><Navigation className="h-4 w-4 animate-spin" /> RETURNING TO BASE</span>
            <span>ETA: 1 min</span>
          </div>
          <p className="text-text-secondary text-[10px]">Autopilot vector locked to Chennai Gateway base station.</p>
        </div>
      ) : (
        <div className="bg-bg-deep/30 border border-border-color/40 rounded-xl p-4 flex items-center justify-center h-20 text-center font-mono text-xs text-text-muted">
          STANDBY STATE &bull; VECTOR IDLE
        </div>
      )}

      {/* Mission History List */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase text-text-secondary tracking-widest font-display font-bold border-b border-border-color pb-1">
          Recent Missions
        </div>
        {droneMissions.length === 0 ? (
          <p className="text-xs text-text-muted font-mono italic">No mission records found.</p>
        ) : (
          <div className="space-y-1.5 font-mono text-xs">
            {droneMissions.map((m) => (
              <div key={m.id} className="flex justify-between items-center py-1 border-b border-border-color/20">
                <span className="text-text-secondary">{new Date(m.dispatch_time).toLocaleDateString()}</span>
                <span className="text-text-primary">Target: {m.target_vessel_id}</span>
                <Badge variant={m.outcome === "SUCCESS" ? "teal" : "red"}>
                  {m.outcome}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 border-t border-border-color pt-4">
        {drone.status === "standby" ? (
          <Button variant="warning" size="sm" className="flex-1 text-xs" onClick={() => onDeployClick(drone.id)}>
            DEPLOY TO DISTRESS
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleReturn} disabled={drone.status !== "deployed"}>
            RETURN TO BASE
          </Button>
        )}
        <Button variant="outline" size="sm" className="text-xs" onClick={handleDiagnostics}>
          DIAGNOSTICS
        </Button>
      </div>
    </div>
  );
};
export default DroneCard;
