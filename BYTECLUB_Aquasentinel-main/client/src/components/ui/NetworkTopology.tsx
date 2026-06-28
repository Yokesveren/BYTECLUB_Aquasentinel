import React, { useEffect, useRef, useState } from "react";
import { RelayNode } from "../../store/nodesStore";

interface NetworkTopologyProps {
  nodes: RelayNode[];
  onNodeClick: (node: RelayNode) => void;
}

interface PhysicsNode {
  id: string;
  name: string;
  type: string;
  status: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  meta: RelayNode;
}

interface PhysicsEdge {
  source: PhysicsNode;
  target: PhysicsNode;
  signal: number;
}

interface Packet {
  source: PhysicsNode;
  target: PhysicsNode;
  t: number; // progress 0 to 1
  speed: number;
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({ nodes, onNodeClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Maintain physics states across frames
  const physicsNodesRef = useRef<PhysicsNode[]>([]);
  const edgesRef = useRef<PhysicsEdge[]>([]);
  const packetsRef = useRef<Packet[]>([]);

  // Initialize and Sync Nodes
  useEffect(() => {
    // Keep old positions if nodes exist to prevent graph from exploding on re-render
    const existingMap = new Map<string, { x: number; y: number; vx: number; vy: number }>();
    physicsNodesRef.current.forEach((n) => {
      existingMap.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy });
    });

    const w = containerRef.current?.clientWidth || 800;
    const h = 300;

    // Create physics nodes
    const physicsNodes: PhysicsNode[] = nodes.map((node) => {
      const old = existingMap.get(node.id);
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        status: node.status,
        x: old ? old.x : w / 2 + (Math.random() - 0.5) * (w * 0.6),
        y: old ? old.y : h / 2 + (Math.random() - 0.5) * (h * 0.6),
        vx: old ? old.vx : 0,
        vy: old ? old.vy : 0,
        meta: node
      };
    });

    // Helper: calculate distance
    const getDist = (n1: RelayNode, n2: RelayNode) => {
      return Math.hypot(n1.lat - n2.lat, n1.lng - n2.lng);
    };

    // Calculate edges (within communicating range)
    // We will use lat-lng distance to decide connections, threshold = 4.0 degrees for visual representation
    const edges: PhysicsEdge[] = [];
    for (let i = 0; i < physicsNodes.length; i++) {
      for (let j = i + 1; j < physicsNodes.length; j++) {
        const n1 = physicsNodes[i];
        const n2 = physicsNodes[j];
        const dist = getDist(n1.meta, n2.meta);
        if (dist < 4.0) {
          edges.push({
            source: n1,
            target: n2,
            signal: Math.floor(Math.max(1, 6 - dist * 1.5))
          });
        }
      }
    }

    physicsNodesRef.current = physicsNodes;
    edgesRef.current = edges;

    // Initialize packet particles if empty
    if (packetsRef.current.length === 0 && edges.length > 0) {
      const packets: Packet[] = [];
      for (let i = 0; i < 15; i++) {
        const edge = edges[Math.floor(Math.random() * edges.length)];
        packets.push({
          source: edge.source,
          target: edge.target,
          t: Math.random(),
          speed: 0.005 + Math.random() * 0.005
        });
      }
      packetsRef.current = packets;
    }
  }, [nodes]);

  // Main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resizeCanvas = () => {
      canvas.width = containerRef.current?.clientWidth || 800;
      canvas.height = 320;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const updatePhysics = () => {
      const pNodes = physicsNodesRef.current;
      const pEdges = edgesRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // Force coefficients
      const kRepulsion = 1500;
      const kAttraction = 0.015;
      const restLength = 120;
      const kGravity = 0.01;

      // Repulsion between all node pairs
      for (let i = 0; i < pNodes.length; i++) {
        for (let j = 0; j < pNodes.length; j++) {
          if (i === j) continue;
          const n1 = pNodes[i];
          const n2 = pNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const d2 = dx * dx + dy * dy + 0.1;
          const d = Math.sqrt(d2);

          if (d < 300) {
            const force = kRepulsion / d2;
            n1.vx -= (dx / d) * force;
            n1.vy -= (dy / d) * force;
          }
        }
      }

      // Attraction along edges
      pEdges.forEach((edge) => {
        const n1 = edge.source;
        const n2 = edge.target;
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const d = Math.hypot(dx, dy) + 0.1;
        
        const force = (d - restLength) * kAttraction;
        
        n1.vx += (dx / d) * force;
        n1.vy += (dy / d) * force;
        n2.vx -= (dx / d) * force;
        n2.vy -= (dy / d) * force;
      });

      // Gravity pulling toward center
      pNodes.forEach((node) => {
        const dx = w / 2 - node.x;
        const dy = h / 2 - node.y;
        node.vx += dx * kGravity;
        node.vy += dy * kGravity;

        // Apply velocities with friction
        node.vx *= 0.8;
        node.vy *= 0.8;
        node.x += node.vx;
        node.y += node.vy;

        // Clamp inside canvas bounds
        node.x = Math.max(20, Math.min(w - 20, node.x));
        node.y = Math.max(20, Math.min(h - 20, node.y));
      });
    };

    const draw = () => {
      const pNodes = physicsNodesRef.current;
      const pEdges = edgesRef.current;
      const packets = packetsRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Colors
      const colors = {
        shore: "#378add",
        buoy: "#00d4aa",
        vessel: "#f5a623",
        alert: "#e74c3c"
      };

      // 1. Draw Edges
      pEdges.forEach((edge) => {
        const isHighlighted = selectedNodeId === edge.source.id || selectedNodeId === edge.target.id;
        ctx.strokeStyle = isHighlighted ? "rgba(0, 212, 170, 0.4)" : "rgba(26, 45, 69, 0.35)";
        ctx.lineWidth = edge.signal * (isHighlighted ? 0.6 : 0.4);
        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);
        ctx.stroke();
      });

      // 2. Draw Packet Particles
      packets.forEach((p) => {
        // Update progress
        p.t += p.speed;
        if (p.t >= 1) {
          p.t = 0;
          // Re-route to random connected node
          const neighbors = pEdges
            .filter((e) => e.source.id === p.target.id || e.target.id === p.target.id)
            .map((e) => (e.source.id === p.target.id ? e.target : e.source));
          
          if (neighbors.length > 0) {
            p.source = p.target;
            p.target = neighbors[Math.floor(Math.random() * neighbors.length)];
          } else {
            // Pick a completely random edge if stuck
            const randomEdge = pEdges[Math.floor(Math.random() * pEdges.length)];
            if (randomEdge) {
              p.source = randomEdge.source;
              p.target = randomEdge.target;
            }
          }
        }

        // Interpolated coordinate
        const px = p.source.x + (p.target.x - p.source.x) * p.t;
        const py = p.source.y + (p.target.y - p.source.y) * p.t;

        ctx.fillStyle = "#00d4aa";
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.shadowColor = "#00d4aa";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // 3. Draw Nodes
      pNodes.forEach((node) => {
        const isSelected = selectedNodeId === node.id;
        const nodeColor = node.status === "alert" ? colors.alert : colors[node.type as keyof typeof colors];

        ctx.save();
        ctx.translate(node.x, node.y);

        // Highlight ring
        if (isSelected) {
          ctx.strokeStyle = "#00d4aa";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw shape based on type
        ctx.fillStyle = nodeColor;
        ctx.strokeStyle = "#07101f";
        ctx.lineWidth = 2;

        if (node.type === "shore") {
          // Shore gateway: large circle
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (node.type === "buoy") {
          // Buoy relay: medium square
          ctx.fillRect(-6, -6, 12, 12);
          ctx.strokeRect(-6, -6, 12, 12);
        } else {
          // Vessel node: small circle
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Blinking alert ring
        if (node.status === "alert") {
          const spread = 8 + Math.sin(Date.now() * 0.01) * 4;
          ctx.strokeStyle = colors.alert;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, spread, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Text ID Label
        ctx.fillStyle = isSelected ? "#00d4aa" : "#7a8ba8";
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.textAlign = "center";
        ctx.fillText(node.id, 0, -14);

        ctx.restore();
      });
    };

    const renderLoop = () => {
      updatePhysics();
      draw();
      animId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [selectedNodeId]);

  // Click handler to select node
  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Find clicked node
    let clickedNode: PhysicsNode | null = null;
    physicsNodesRef.current.forEach((n) => {
      const dist = Math.hypot(n.x - mx, n.y - my);
      if (dist < 15) {
        clickedNode = n;
      }
    });

    if (clickedNode) {
      const n = clickedNode as PhysicsNode;
      setSelectedNodeId(n.id);
      onNodeClick(n.meta);
    } else {
      setSelectedNodeId(null);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full block cursor-pointer"
      />
    </div>
  );
};
export default NetworkTopology;
