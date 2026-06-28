import React, { useEffect } from "react";
import { LeafletMap } from "../components/map/LeafletMap";
import { useVesselsStore } from "../store/vesselsStore";
import { useAlertsStore } from "../store/alertsStore";
import { useNodesStore } from "../store/nodesStore";

export const LiveMap: React.FC = () => {
  const fetchVessels = useVesselsStore((state: any) => state.fetchVessels);
  const fetchAlerts = useAlertsStore((state: any) => state.fetchAlerts);
  const fetchNodes = useNodesStore((state: any) => state.fetchNodes);

  useEffect(() => {
    fetchVessels();
    fetchAlerts();
    fetchNodes();
  }, []);

  return (
    <div className="absolute inset-0 pt-[60px] pl-16 w-full h-full overflow-hidden">
      <LeafletMap mode="live" />
    </div>
  );
};
export default LiveMap;
