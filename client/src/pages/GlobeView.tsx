import React, { useEffect } from "react";
import { ThreeGlobe } from "../components/globe/ThreeGlobe";
import { useNodesStore } from "../store/nodesStore";

export const GlobeView: React.FC = () => {
  const fetchNodes = useNodesStore((state: any) => state.fetchNodes);

  useEffect(() => {
    fetchNodes();
  }, []);

  return (
    <div className="absolute inset-0 pt-[60px] pl-16 w-full h-full overflow-hidden bg-bg-deep">
      <ThreeGlobe />
    </div>
  );
};
export default GlobeView;
