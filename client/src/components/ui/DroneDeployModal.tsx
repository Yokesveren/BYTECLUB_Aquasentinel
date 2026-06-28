import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { useDronesStore } from "../../store/dronesStore";
import toast from "react-hot-toast";

interface AlertItem {
  id: string;
  vessel_id: string;
  type: "CAPSIZE" | "MANUAL_SOS" | "WELFARE_CHECK";
  lat: number;
  lng: number;
  status: string;
}

interface DroneDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  droneId: string;
}

export const DroneDeployModal: React.FC<DroneDeployModalProps> = ({
  isOpen,
  onClose,
  droneId
}) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string>("");

  const deployDrone = useDronesStore((state) => state.deployDrone);
  const triggerFlightAnimation = useDronesStore((state) => state.triggerFlightAnimation);

  useEffect(() => {
    if (!isOpen) return;

    const fetchActiveAlerts = async () => {
      setLoading(true);
      try {
        const res = await api.get("/alerts?status=incoming");
        // Also support fetching all alerts and filtering if count is low
        const list = res.data.data || res.data;
        const incomingAlerts = list.filter((a: any) => a.status === "incoming");
        setAlerts(incomingAlerts);
        if (incomingAlerts.length > 0) {
          setSelectedAlertId(incomingAlerts[0].id);
        }
      } catch (err) {
        toast.error("Failed to load active alerts");
      } finally {
        setLoading(false);
      }
    };

    fetchActiveAlerts();
  }, [isOpen]);

  const handleConfirmDeploy = async () => {
    if (!selectedAlertId) {
      toast.error("Please select a distress alert");
      return;
    }

    const alert = alerts.find((a) => a.id === selectedAlertId);
    if (!alert) return;

    try {
      await deployDrone(droneId, alert.id, alert.vessel_id);
      
      // Calculate random screen position in center region to fly to
      const targetPos = {
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 150,
        y: window.innerHeight / 2 - 120
      };

      // Trigger the flight canvas animation
      triggerFlightAnimation(droneId, targetPos);
      
      toast.success(`Quadcopter ${droneId} dispatched to vessel ${alert.vessel_id}`);
      onClose();
    } catch (err) {
      toast.error("Deployment failed");
    }
  };

  const badgeVariant = {
    CAPSIZE: "red",
    MANUAL_SOS: "amber",
    WELFARE_CHECK: "blue"
  } as const;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="DISPATCH EMERGENCY DRONE">
      {loading ? (
        <div className="space-y-3">
          <div className="h-6 bg-border-color/30 rounded animate-pulse" />
          <div className="h-20 bg-border-color/20 rounded animate-pulse" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-6 text-text-secondary font-mono space-y-4">
          <p>NO ACTIVE INCOMING DISTRESS SIGNALS FOUND</p>
          <Button variant="outline" size="sm" onClick={onClose}>
            CANCEL
          </Button>
        </div>
      ) : (
        <div className="space-y-4 font-mono text-xs">
          <p className="text-text-secondary">
            Select one of the incoming distress signals to dispatch drone <span className="text-accent-teal font-bold">{droneId}</span>:
          </p>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {alerts.map((a) => (
              <label
                key={a.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-border-color/20 transition-all ${
                  selectedAlertId === a.id
                    ? "border-accent-teal bg-accent-teal/5"
                    : "border-border-color bg-bg-card/40"
                }`}
              >
                <input
                  type="radio"
                  name="deploy-alert"
                  value={a.id}
                  checked={selectedAlertId === a.id}
                  onChange={() => setSelectedAlertId(a.id)}
                  className="accent-accent-teal"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-text-primary">{a.vessel_id}</span>
                    <Badge variant={badgeVariant[a.type]}>{a.type}</Badge>
                  </div>
                  <div className="text-text-secondary text-[10px]">
                    GPS: {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="border-t border-border-color pt-4 flex gap-3 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              CANCEL
            </Button>
            <Button variant="warning" size="sm" onClick={handleConfirmDeploy}>
              CONFIRM DISPATCH
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
