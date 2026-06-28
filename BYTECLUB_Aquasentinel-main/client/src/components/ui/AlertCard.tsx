import React, { useState } from "react";
import { motion } from "framer-motion";
import { Alert, useAlertsStore } from "../../store/alertsStore";
import { Badge } from "./Badge";
import { Button } from "./Button";
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  Cpu,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Activity
} from "lucide-react";
import toast from "react-hot-toast";

interface AlertCardProps {
  alert: Alert;
  onDispatchDrone: (alertId: string, vesselId: string) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onDispatchDrone }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const acknowledgeAlert = useAlertsStore((state) => state.acknowledgeAlert);

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await acknowledgeAlert(alert.id);
      toast.success(`Alert ${alert.id.substring(0, 8)} acknowledged.`);
    } catch (err) {
      toast.error("Acknowledge failed.");
    }
  };

  const getBorderColor = () => {
    if (alert.acknowledged) return "border-l-border-strong";
    if (alert.type === "CAPSIZE") return "border-l-accent-red";
    if (alert.type === "MANUAL_SOS") return "border-l-accent-amber";
    return "border-l-accent-blue";
  };

  const getStepperIndex = () => {
    if (alert.status === "incoming") return 0;
    if (alert.status === "drone_dispatched") return 1;
    if (alert.status === "rescue_en_route" || alert.status === "resolved") return 2;
    return -1;
  };

  const timeAgo = (dateStr: string) => {
    const elapsed = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return "just now";
    return `${minutes} min ago`;
  };

  // Critical Level parameters
  const getCriticalLevel = () => {
    if (alert.type === "CAPSIZE") {
      return { label: "CRITICAL", color: "text-accent-red bg-accent-red/10 border-accent-red/20", icon: AlertTriangle };
    }
    if (alert.type === "MANUAL_SOS") {
      return { label: "HIGH", color: "text-accent-amber bg-accent-amber/10 border-accent-amber/20", icon: AlertOctagon };
    }
    return { label: "MEDIUM", color: "text-accent-blue bg-accent-blue/10 border-accent-blue/20", icon: Info };
  };

  // Signal Origin parameters
  const getSignalOrigin = () => {
    if (alert.type === "CAPSIZE") {
      return { label: "AUTO-SENSOR (MPU6050)", icon: Cpu, color: "#00d4aa" };
    }
    if (alert.type === "MANUAL_SOS") {
      return { label: "PHYSICAL SOS BUTTON", icon: AlertOctagon, color: "#f5a623" };
    }
    return { label: "DEAD MAN SWITCH", icon: Clock, color: "#378add" };
  };

  const crit = getCriticalLevel();
  const origin = getSignalOrigin();
  const CritIcon = crit.icon;
  const OriginIcon = origin.icon;

  return (
    <motion.div
      layoutId={`alert-card-${alert.id}`}
      className={`relative card-glass border-l-4 ${getBorderColor()} p-4 flex flex-col gap-3 overflow-hidden transition-all duration-300`}
    >
      {/* Watermark for Acknowledged state */}
      {alert.acknowledged === 1 && (
        <CheckCircle className="absolute right-4 bottom-4 h-24 w-24 text-accent-teal opacity-[0.04] pointer-events-none select-none" />
      )}

      {/* Main Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-text-primary text-sm tracking-wide">
            {alert.vessel_id}
          </span>
          <Badge variant={alert.type === "CAPSIZE" ? "red" : alert.type === "MANUAL_SOS" ? "amber" : "blue"}>
            {alert.type}
          </Badge>
        </div>
        <span className="text-[10px] text-text-secondary font-mono">
          {timeAgo(alert.created_at)}
        </span>
      </div>

      {/* Basic Coordinates & Hop Info */}
      <div className="flex justify-between items-center text-[11px] font-mono text-text-secondary">
        <span>GPS: {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}</span>
        <span>Hops: {alert.hop_count}</span>
      </div>

      {/* Acknowledged Badges layout */}
      {alert.acknowledged === 1 ? (
        <div className="space-y-1.5 mt-1 border-t border-border-color/30 pt-2.5">
          {/* Row 1: Critical level */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <CritIcon className="h-4 w-4 shrink-0 text-text-secondary" />
            <span className="text-text-secondary">CRITICAL LEVEL:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${crit.color}`}>
              {crit.label}
            </span>
          </div>

          {/* Row 2: Signal Origin */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <OriginIcon className="h-4 w-4 shrink-0" style={{ color: origin.color }} />
            <span className="text-text-secondary">ORIGIN:</span>
            <span className="text-text-primary font-semibold uppercase">{origin.label}</span>
          </div>

          {/* Row 3: Timestamp */}
          <div className="text-[10px] text-text-muted mt-2">
            Acknowledged {alert.acknowledged_at ? timeAgo(alert.acknowledged_at) : "recently"}
          </div>
        </div>
      ) : (
        /* Action buttons for Unacknowledged state */
        <div className="flex gap-2 mt-1.5">
          <Button variant="outline" size="sm" className="flex-1 text-xs py-1" onClick={handleAcknowledge}>
            ACKNOWLEDGE
          </Button>
          <Button
            variant="warning"
            size="sm"
            className="flex-1 text-xs py-1"
            onClick={(e) => {
              e.stopPropagation();
              onDispatchDrone(alert.id, alert.vessel_id);
            }}
          >
            DISPATCH DRONE
          </Button>
        </div>
      )}

      {/* Stepper Status Progression */}
      <div className="mt-2 border-t border-border-color/30 pt-3">
        <div className="flex justify-between items-center relative">
          {/* Line behind stepper */}
          <div className="absolute left-0 right-0 top-1.5 h-0.5 bg-border-color -z-10" />
          
          {[
            { label: "SIGNAL RECEIVED", done: getStepperIndex() >= 0 },
            { label: "DRONE DISPATCHED", done: getStepperIndex() >= 1 },
            { label: "RESCUE EN ROUTE", done: getStepperIndex() >= 2 }
          ].map((step, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div
                className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center bg-bg-deep transition-colors duration-300 ${
                  step.done
                    ? alert.acknowledged === 1
                      ? "border-accent-teal bg-accent-teal/20"
                      : "border-accent-red bg-accent-red/20"
                    : "border-border-color"
                }`}
              />
              <span className="text-[8px] font-mono text-text-muted mt-1 uppercase text-center max-w-[70px] whitespace-normal">
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expand trigger */}
      <div
        className="flex items-center justify-center border-t border-border-color/30 pt-2 mt-1 cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <span className="flex items-center gap-1 text-[10px] font-mono">
            COLLAPSE DETAILS <ChevronUp className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-mono">
            EXPAND SIGNAL TELEMETRY <ChevronDown className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="text-[11px] font-mono text-text-secondary space-y-1 bg-bg-deep/40 p-2.5 rounded border border-border-color/40 mt-1"
        >
          <div><span className="text-text-muted">ALERT ID:</span> {alert.id}</div>
          <div><span className="text-text-muted">VESSEL HEAD:</span> MESH buoys linked via buoy ID {alert.node_id}</div>
          {alert.drone_id && (
            <div><span className="text-text-muted">RESP. DRONE:</span> {alert.drone_id}</div>
          )}
          <div className="flex items-center gap-1 mt-1 text-[10px] text-accent-teal">
            <Activity className="h-3 w-3 animate-pulse" /> SIMULATION PATH FEED NOMINAL
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
