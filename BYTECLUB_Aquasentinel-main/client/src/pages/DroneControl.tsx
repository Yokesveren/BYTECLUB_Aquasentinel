import React, { useEffect, useState } from "react";
import { useDronesStore } from "../store/dronesStore";
import { DroneCard } from "../components/ui/DroneCard";
import { DroneDeployModal } from "../components/ui/DroneDeployModal";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ClipboardList, Play, ArrowUpDown } from "lucide-react";
import toast from "react-hot-toast";

export const DroneControl: React.FC = () => {
  const { drones, missions, fetchDrones, fetchMissions } = useDronesStore();

  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [selectedDroneId, setSelectedDroneId] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchDrones();
    fetchMissions();
  }, []);

  const handleDeployClick = (droneId: string) => {
    setSelectedDroneId(droneId);
    setDeployModalOpen(true);
  };

  const handlePlayRecording = (missionId: string) => {
    toast.success(`Loading HD playback logs for mission ${missionId.substring(0, 8)}...`);
  };

  const sortedMissions = [...missions].sort((a, b) => {
    const dateA = new Date(a.dispatch_time).getTime();
    const dateB = new Date(b.dispatch_time).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-text-primary">
          DRONE FLEET CONTROL
        </h1>
        <p className="text-xs text-text-secondary font-mono mt-1">
          AERIAL SURVEILLANCE & DISTRESS RESCUE FLIGHT SYSTEMS
        </p>
      </div>

      {/* DRONE CARDS GRID (DR-01, DR-02) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {drones.map((drone: any) => (
          <DroneCard key={drone.id} drone={drone} onDeployClick={handleDeployClick} />
        ))}
      </div>

      {/* MISSION HISTORY SECTION */}
      <div className="panel-glass p-5">
        <div className="flex justify-between items-center border-b border-border-color pb-3 mb-4">
          <h3 className="font-display font-bold text-text-primary text-sm tracking-wider uppercase flex items-center gap-2">
            <ClipboardList className="h-4.5 w-4.5 text-accent-teal" />
            Completed Drone Flight Missions
          </h3>
          <Button variant="outline" size="sm" onClick={toggleSort} className="text-xs font-mono py-1 flex items-center gap-1">
            Sort Date <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>

        {/* Scrollable Mission History Table */}
        <div className="overflow-x-auto border border-border-color/30 rounded-lg">
          <table className="w-full text-left font-mono text-[11px] text-text-primary border-collapse">
            <thead className="bg-bg-deep/80 text-text-secondary sticky top-0 uppercase border-b border-border-color">
              <tr>
                <th className="p-3">Drone ID</th>
                <th className="p-3">Mission ID</th>
                <th className="p-3">Target Vessel</th>
                <th className="p-3">Dispatch Time</th>
                <th className="p-3">Return Time</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Outcome</th>
                <th className="p-3 text-center">Telemetry logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color/30">
              {sortedMissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-text-muted italic">
                    No flight records found.
                  </td>
                </tr>
              ) : (
                sortedMissions.map((m) => (
                  <tr key={m.id} className="hover:bg-border-strong/10">
                    <td className="p-3 text-accent-blue font-bold">{m.drone_id}</td>
                    <td className="p-3">{m.id.substring(0, 8)}...</td>
                    <td className="p-3 font-bold text-accent-teal">{m.target_vessel_id}</td>
                    <td className="p-3 font-sans text-text-secondary">
                      {new Date(m.dispatch_time).toLocaleString()}
                    </td>
                    <td className="p-3 font-sans text-text-secondary">
                      {m.return_time ? new Date(m.return_time).toLocaleString() : "Active"}
                    </td>
                    <td className="p-3">{m.duration_minutes ? `${m.duration_minutes}m` : "-"}</td>
                    <td className="p-3">
                      <Badge variant={m.outcome === "SUCCESS" ? "teal" : m.outcome === "ABORTED" ? "red" : "amber"}>
                        {m.outcome}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePlayRecording(m.id)}
                        className="py-0.5 px-2 text-[9px]"
                      >
                        <Play className="h-3 w-3 mr-1 inline" /> PLAY
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DroneDeployModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        droneId={selectedDroneId}
      />
    </div>
  );
};
export default DroneControl;
