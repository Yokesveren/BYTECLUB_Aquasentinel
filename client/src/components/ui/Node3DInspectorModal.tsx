import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RelayNode } from "../../store/nodesStore";
import api from "../../lib/api";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { X, Radio, Battery, Activity, Compass, Cpu, Clock, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface Node3DInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: RelayNode | null;
  onViewOnMap: (nodeId: string) => void;
}

export const Node3DInspectorModal: React.FC<Node3DInspectorModalProps> = ({
  isOpen,
  onClose,
  node,
  onViewOnMap
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // States for panel data
  const [neighbors, setNeighbors] = useState<any[]>([]);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const [lastPingSeconds, setLastPingSeconds] = useState(0);

  // 3D Scene Controls Refs
  const isDragging = useRef(false);
  const rotationY = useRef(0);
  const rotationX = useRef(0.2);
  const prevMouseX = useRef(0);
  const prevMouseY = useRef(0);

  // Fetch Neighbors and Ping Info
  useEffect(() => {
    if (!isOpen || !node) return;

    // Fetch neighbors
    const fetchNeighbors = async () => {
      try {
        const res = await api.get(`/nodes/${node.id}/neighbors`);
        setNeighbors(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNeighbors();

    // Reset ping latency output
    setPingResult(null);
    setLastPingSeconds(0);

    const pingTimer = setInterval(() => {
      setLastPingSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(pingTimer);
  }, [isOpen, node]);

  // Three.js 3D Node Rendering
  useEffect(() => {
    if (!isOpen || !node || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x071828, 0.08);

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0.5, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0x112244, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 5, 2);
    scene.add(dirLight);

    // 4. Ocean Surface Plane
    const oceanGeo = new THREE.PlaneGeometry(20, 20, 40, 40);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0a2040,
      metalness: 0.8,
      roughness: 0.2,
      flatShading: true,
      transparent: true,
      opacity: 0.85
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    scene.add(ocean);

    // 5. Node Mesh Group
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    // Color code based on status
    const statusColors = {
      online: "#00d4aa",
      alert: "#e74c3c",
      degraded: "#f5a623",
      offline: "#4a6a8a"
    };
    const mainColor = statusColors[node.status];

    // Build model based on type
    if (node.type === "buoy") {
      // Orange Float Cylinder
      const floatGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
      const floatMat = new THREE.MeshStandardMaterial({
        color: 0xff6b00, // safety orange
        metalness: 0.5,
        roughness: 0.4
      });
      const floatMesh = new THREE.Mesh(floatGeo, floatMat);
      floatMesh.position.y = 0.15;
      nodeGroup.add(floatMesh);

      // Antenna Pole
      const antGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.3, 8);
      const antMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const antenna = new THREE.Mesh(antGeo, antMat);
      antenna.position.y = 0.8;
      nodeGroup.add(antenna);

      // Solar Panel
      const solarGeo = new THREE.BoxGeometry(0.5, 0.02, 0.3);
      const solarMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        emissive: 0x4444ff,
        emissiveIntensity: 0.3
      });
      const solar = new THREE.Mesh(solarGeo, solarMat);
      solar.position.set(0, 0.3, 0.2);
      solar.rotation.x = 0.3;
      nodeGroup.add(solar);

      // Mooring chain
      for (let i = 0; i < 5; i++) {
        const chainGeo = new THREE.TorusGeometry(0.05, 0.015, 6, 12);
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
        const link = new THREE.Mesh(chainGeo, chainMat);
        link.position.set(0, -i * 0.15, 0);
        link.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
        nodeGroup.add(link);
      }
    } 
    else if (node.type === "shore") {
      // Concrete Base
      const baseGeo = new THREE.BoxGeometry(1.2, 0.3, 1.2);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.15;
      nodeGroup.add(baseMesh);

      // Tower
      const towerGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.5, 16);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x777777 });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.y = 1.4;
      nodeGroup.add(tower);

      // Equipment Box
      const boxGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      const boxMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        emissive: new THREE.Color(mainColor),
        emissiveIntensity: 0.2
      });
      const equipBox = new THREE.Mesh(boxGeo, boxMat);
      equipBox.position.set(0.3, 0.45, 0);
      nodeGroup.add(equipBox);

      // Beacon Globe Light
      const beaconGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xf5a623,
        emissiveIntensity: 1.0
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 2.7;
      nodeGroup.add(beacon);

      const beaconLight = new THREE.PointLight(0xf5a623, 1, 3);
      beaconLight.position.set(0, 2.7, 0);
      nodeGroup.add(beaconLight);
    }
    else if (node.type === "vessel") {
      // Ship Hull top-down shape extruded
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.6);
      shape.quadraticCurveTo(0.25, 0.2, 0.25, -0.4);
      shape.lineTo(-0.25, -0.4);
      shape.quadraticCurveTo(-0.25, 0.2, 0, 0.6);

      const extrudeSettings = { depth: 0.25, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
      const hullGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const hullMat = new THREE.MeshStandardMaterial({ color: 0x111f35, metalness: 0.7, roughness: 0.3 });
      const hull = new THREE.Mesh(hullGeo, hullMat);
      hull.rotation.x = -Math.PI / 2;
      hull.position.y = 0.15;
      nodeGroup.add(hull);

      // Mast
      const mastGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.0);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.set(0, 0.7, -0.1);
      nodeGroup.add(mast);
    }

    // 6. Signal LoRa Rings (horizontal wireframe torus pulsing)
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const ringCount = 3;
    const ringMeshes: THREE.Mesh[] = [];
    const ringGeo = new THREE.TorusGeometry(1, 0.01, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(mainColor),
      transparent: true,
      opacity: 0.5
    });

    for (let i = 0; i < ringCount; i++) {
      const ring = new THREE.Mesh(ringGeo, ringMat.clone());
      ring.rotation.x = Math.PI / 2;
      ring.position.y = node.type === "shore" ? 2.5 : 0.8;
      ringGroup.add(ring);
      ringMeshes.push(ring);
    }

    // 7. Water Spray / Wave Particle Systems
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 20;
    const posArr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArr[i] = (Math.random() - 0.5) * 1.5; // X
      posArr[i + 1] = 0.05;                    // Y
      posArr[i + 2] = (Math.random() - 0.5) * 1.5; // Z
    }
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00d4aa,
      size: 0.05,
      transparent: true,
      opacity: 0.4
    });
    const sprayParticles = new THREE.Points(particlesGeo, pMat);
    scene.add(sprayParticles);

    // Animation variables
    let animId: number;
    const clock = new THREE.Clock();

    const animate3D = () => {
      animId = requestAnimationFrame(animate3D);

      const time = clock.getElapsedTime();

      // Wave Vertex Animation
      const posAttr = oceanGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = Math.sin(time + x * 0.5) * 0.15 + Math.cos(time * 0.7 + y * 0.5) * 0.1;
        posAttr.setZ(i, z);
      }
      posAttr.needsUpdate = true;

      // Bobbing Buoy Animation
      if (node.type === "buoy") {
        nodeGroup.position.y = Math.sin(time * 1.2) * 0.08;
        nodeGroup.rotation.z = Math.cos(time * 0.8) * 0.05;
      }

      // Rotating beacon for shore lighthouse
      if (node.type === "shore") {
        const light = nodeGroup.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight;
        if (light) {
          light.intensity = (Math.sin(time * 4) + 1.2) * 0.8;
        }
      }

      // Signal rings pulsing
      ringMeshes.forEach((ring, idx) => {
        // Offset starting times
        const ringTime = (time * 0.8 + idx / ringCount) % 1;
        const scale = 0.4 + ringTime * 2.5; // grows from 0.4x to 3x
        ring.scale.set(scale, scale, 1);
        
        // Fades opacity as scale increases
        if (Array.isArray(ring.material)) {
          // not expected
        } else {
          ring.material.opacity = Math.max(0, 1 - ringTime);
        }
      });

      // Slowly update spray particles
      const sprayPos = sprayParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        let py = sprayPos.getY(i);
        py += 0.002;
        if (py > 0.4) {
          py = 0.05;
        }
        sprayPos.setY(i, py);
      }
      sprayPos.needsUpdate = true;

      // Manual camera rotation by dragging
      camera.position.x = 5 * Math.sin(rotationY.current) * Math.cos(rotationX.current);
      camera.position.z = 5 * Math.cos(rotationY.current) * Math.cos(rotationX.current);
      camera.position.y = 5 * Math.sin(rotationX.current) + 0.5;
      camera.lookAt(0, 0.5, 0);

      renderer.render(scene, camera);
    };

    animate3D();

    // Handle container resizing
    const resizeObserver = new ResizeObserver(() => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [isOpen, node]);

  // Ping action
  const handlePingClick = async () => {
    if (!node || pinging) return;
    setPinging(true);
    try {
      const res = await api.post(`/nodes/${node.id}/ping`);
      setPingResult(`${res.data.latency}ms`);
      setLastPingSeconds(0);
      toast.success(`Ping returned in ${res.data.latency}ms`);
    } catch (err) {
      toast.error("Ping node failed");
    } finally {
      setPinging(false);
    }
  };

  // Drag interaction math
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    prevMouseX.current = e.clientX;
    prevMouseY.current = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - prevMouseX.current;
    const deltaY = e.clientY - prevMouseY.current;

    rotationY.current -= deltaX * 0.007;
    rotationX.current = Math.max(-0.4, Math.min(1.2, rotationX.current + deltaY * 0.007));

    prevMouseX.current = e.clientX;
    prevMouseY.current = e.clientY;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  if (!isOpen || !node) return null;

  const nodeStatusColors = {
    online: "teal",
    alert: "red",
    degraded: "amber",
    offline: "gray"
  } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-bg-deep/85 backdrop-blur-md" />

      {/* Modal frame */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-bg-panel border border-border-color rounded-xl overflow-hidden shadow-2xl flex z-10">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-border-color/30 transition-colors z-20"
        >
          <X className="h-5 w-5" />
        </button>

        {/* LEFT 60%: THREE.JS canvas */}
        <div ref={containerRef} className="w-3/5 h-full relative bg-gradient-to-b from-bg-deep to-[#050c18] border-r border-border-color select-none">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full block cursor-grab active:cursor-grabbing"
          />
          {/* Compass indicators / Overlay HUD info */}
          <div className="absolute bottom-4 left-4 font-mono text-[10px] text-text-secondary bg-bg-deep/75 px-3 py-1.5 border border-border-color rounded-lg backdrop-blur flex items-center gap-2">
            <Compass className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "10s" }} />
            DRAG TO ROTATE 3D VIEWPORT
          </div>
        </div>

        {/* RIGHT 40%: Data panel */}
        <div className="w-2/5 h-full flex flex-col p-6 overflow-y-auto">
          {/* Header */}
          <div className="border-b border-border-color pb-4 mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold font-mono text-text-primary tracking-wide">
                {node.id}
              </h2>
              <Badge variant={nodeStatusColors[node.status]}>{node.status}</Badge>
            </div>
            <p className="text-xs text-text-secondary font-sans">{node.name} &bull; {node.location_name}</p>
          </div>

          <div className="flex-1 space-y-6 text-sm font-mono">
            {/* HARDWARE STATUS */}
            <div>
              <div className="text-[10px] uppercase text-text-secondary tracking-widest font-display font-bold border-b border-border-color pb-1 mb-3">
                Hardware Health
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary flex items-center gap-1.5"><Radio className="h-3.5 w-3.5" /> Signal Strength</span>
                    <span className="text-text-primary font-bold">{node.signal_strength}/5</span>
                  </div>
                  <div className="w-full bg-border-color h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${node.signal_strength >= 4 ? "bg-accent-teal" : node.signal_strength >= 2 ? "bg-accent-amber" : "bg-accent-red"}`}
                      style={{ width: `${(node.signal_strength / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary flex items-center gap-1.5"><Battery className="h-3.5 w-3.5" /> Battery Capacity</span>
                    <span className="text-text-primary font-bold">{node.battery_pct}%</span>
                  </div>
                  <div className="w-full bg-border-color h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${node.battery_pct >= 60 ? "bg-accent-teal" : node.battery_pct >= 20 ? "bg-accent-amber" : "bg-accent-red"}`}
                      style={{ width: `${node.battery_pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-xs py-1 border-b border-border-color/30">
                  <span className="text-text-secondary flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Uptime Metric</span>
                  <span className="text-accent-teal font-bold">{node.uptime_pct}%</span>
                </div>

                <div className="flex justify-between text-xs py-1 border-b border-border-color/30">
                  <span className="text-text-secondary flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Last Ping Trace</span>
                  <span className="text-text-primary">{lastPingSeconds}s ago</span>
                </div>

                <div className="flex justify-between text-xs py-1 border-b border-border-color/30">
                  <span className="text-text-secondary flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" /> Firmware Revision</span>
                  <span className="text-text-primary">{node.firmware_version}</span>
                </div>
              </div>
            </div>

            {/* CONNECTIVITY */}
            <div>
              <div className="text-[10px] uppercase text-text-secondary tracking-widest font-display font-bold border-b border-border-color pb-1 mb-3">
                Connectivity Hops
              </div>
              {neighbors.length === 0 ? (
                <div className="text-xs text-text-muted">No mesh neighbors within 350km range.</div>
              ) : (
                <div className="space-y-2">
                  {neighbors.slice(0, 3).map((n) => (
                    <div key={n.id} className="flex items-center justify-between text-xs p-2 rounded bg-bg-card/40 border border-border-color/30">
                      <span className="text-text-primary font-bold">{n.id}</span>
                      <span className="text-text-secondary text-[10px]">{n.distance.toFixed(1)} km</span>
                      <Badge variant={n.signal_quality === "Excellent" ? "teal" : n.signal_quality === "Good" ? "blue" : "amber"}>
                        {n.signal_quality}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GEOLOCATION */}
            <div>
              <div className="text-[10px] uppercase text-text-secondary tracking-widest font-display font-bold border-b border-border-color pb-1 mb-3">
                Location Details
              </div>
              <div className="space-y-1.5 text-xs text-text-primary">
                <div><span className="text-text-secondary">Coordinates:</span> {node.lat.toFixed(4)}°, {node.lng.toFixed(4)}°</div>
                {node.type === "buoy" && (
                  <div><span className="text-text-secondary">Ocean Depth:</span> 42 meters below surface</div>
                )}
                <div><span className="text-text-secondary">Deployment Date:</span> 2025-08-12</div>
              </div>
            </div>
          </div>

          {/* Action Buttons footer */}
          <div className="border-t border-border-color pt-6 mt-6 flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePingClick}
              disabled={pinging}
              className="flex-1 font-bold text-xs"
            >
              {pinging ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Radio className="h-3.5 w-3.5 mr-1.5" />
              )}
              {pingResult ? `PING: ${pingResult}` : "PING NODE"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onViewOnMap(node.id);
                onClose();
              }}
              className="flex-1 font-bold text-xs"
            >
              VIEW ON MAP
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Node3DInspectorModal;
