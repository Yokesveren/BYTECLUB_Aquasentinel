import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useNodesStore, RelayNode } from "../../store/nodesStore";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export const ThreeGlobe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodes = useNodesStore((state) => state.nodes);

  // States
  const [hoveredNode, setHoveredNode] = useState<RelayNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [filter, setFilter] = useState<"all" | "shore" | "buoy" | "vessel" | "alert">("all");

  // Refs for 3D engine controls
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Interaction variables
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const lastInteractTime = useRef(Date.now());
  const cameraDistance = useRef(4.0);
  const targetDistance = useRef(4.0);
  
  // Camera flight target
  const targetCameraPos = useRef<THREE.Vector3 | null>(null);

  // Calculate 3D coordinates from Lat/Lng
  const latLngTo3D = (lat: number, lng: number, radius = 2.05): THREE.Vector3 => {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lng + 180) * Math.PI) / 180;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  };

  // Flying target region
  const flyToRegion = (lat: number, lng: number) => {
    targetDistance.current = 3.0; // zoom in on fly
    const pos = latLngTo3D(lat, lng, targetDistance.current);
    targetCameraPos.current = pos;
    lastInteractTime.current = Date.now();
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // 1. Create Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Create Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = cameraDistance.current;
    cameraRef.current = camera;

    // 3. Create Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 4. Create Lights
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // 5. Create Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Load Textures
    const textureLoader = new THREE.TextureLoader();
    const earthMap = textureLoader.load(
      "https://unpkg.com/three-globe/example/img/earth-dark.jpg"
    );
    const bumpMap = textureLoader.load(
      "https://unpkg.com/three-globe/example/img/earth-topology.png"
    );
    const specularMap = textureLoader.load(
      "https://unpkg.com/three-globe/example/img/earth-water.png"
    );

    // Globe Base Mesh
    const globeGeo = new THREE.SphereGeometry(2, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({
      map: earthMap,
      bumpMap: bumpMap,
      bumpScale: 0.05,
      specularMap: specularMap,
      specular: new THREE.Color("#0c1828"),
      shininess: 10
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globe);

    // Atmosphere Glow Mesh
    const atmosGeo = new THREE.SphereGeometry(2.05, 64, 64);
    const atmosMat = new THREE.MeshPhongMaterial({
      color: 0x0066ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    globeGroup.add(atmosphere);

    // Add Gridlines
    const gridGeo = new THREE.SphereGeometry(2.01, 32, 32);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x0066ff,
      wireframe: true,
      transparent: true,
      opacity: 0.02
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    globeGroup.add(grid);

    // Render loop variables
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Handle Camera Lerping (Flying)
      if (targetCameraPos.current) {
        camera.position.lerp(targetCameraPos.current, 0.05);
        if (camera.position.distanceTo(targetCameraPos.current) < 0.01) {
          targetCameraPos.current = null;
        }
      }

      // Handle Zoom Zoom Lerping
      cameraDistance.current = THREE.MathUtils.lerp(
        cameraDistance.current,
        targetDistance.current,
        0.1
      );
      if (!targetCameraPos.current) {
        // If not flying, position camera relative to direction
        const dir = camera.position.clone().normalize();
        camera.position.copy(dir.multiplyScalar(cameraDistance.current));
      }

      // Auto Rotation (resumes 3 seconds after drag)
      if (Date.now() - lastInteractTime.current > 3000) {
        globeGroup.rotation.y += 0.0008;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Event Resizing
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Sync / Plot nodes in 3D scene when filter or nodes data changes
  useEffect(() => {
    const scene = sceneRef.current;
    const globeGroup = globeGroupRef.current;
    if (!scene || !globeGroup) return;

    // Clear previous meshes
    nodeMeshesRef.current.forEach((mesh) => {
      globeGroup.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    nodeMeshesRef.current.clear();

    // Color definitions
    const colors = {
      shore: "#378add",
      buoy: "#00d4aa",
      vessel: "#f5a623",
      alert: "#e74c3c"
    };

    // Filter nodes
    const filteredNodes = nodes.filter((n) => {
      if (filter === "all") return true;
      if (filter === "alert") return n.status === "alert";
      return n.type === filter;
    });

    // Node Sphere Geometry
    const nodeGeo = new THREE.SphereGeometry(0.025, 8, 8);

    filteredNodes.forEach((node) => {
      const typeColor = node.status === "alert" ? colors.alert : colors[node.type];
      const nodeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(typeColor)
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);

      // Coordinates
      const pos = latLngTo3D(node.lat, node.lng, 2.02);
      nodeMesh.position.copy(pos);
      
      // Save reference to nodes meta on mesh for raycasting
      nodeMesh.userData = { node };

      // Glow light for Alerts
      if (node.status === "alert") {
        const pointLight = new THREE.PointLight(new THREE.Color(colors.alert), 1, 0.4);
        pointLight.position.copy(pos);
        nodeMesh.add(pointLight);
      }

      globeGroup.add(nodeMesh);
      nodeMeshesRef.current.set(node.id, nodeMesh);
    });
  }, [nodes, filter]);

  // Mouse Interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
    lastInteractTime.current = Date.now();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const globeGroup = globeGroupRef.current;
    if (!container || !camera || !globeGroup) return;

    // Drag Rotation
    if (isDragging.current) {
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      globeGroup.rotation.y += deltaX * 0.005;
      globeGroup.rotation.x += deltaY * 0.005;

      // Clamp X rotation to avoid camera flipping at poles
      globeGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globeGroup.rotation.x));

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
      lastInteractTime.current = Date.now();
      return;
    }

    // Raycast / Hover Detection
    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    // Intersect nodes
    const meshes = Array.from(nodeMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitNode = intersects[0].object.userData.node as RelayNode;
      setHoveredNode(hitNode);
      setTooltipPos({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top + 15 });
    } else {
      setHoveredNode(null);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    targetDistance.current = Math.max(2.5, Math.min(8.0, targetDistance.current + e.deltaY * 0.004));
    lastInteractTime.current = Date.now();
  };

  // Click Raycaster (to Fly camera)
  const handleClick = (e: React.MouseEvent) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container || !camera) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    const meshes = Array.from(nodeMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitNode = intersects[0].object.userData.node as RelayNode;
      flyToRegion(hitNode.lat, hitNode.lng);
    }
  };

  // Touch Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastInteractTime.current = Date.now();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const globeGroup = globeGroupRef.current;
    if (!globeGroup || !isDragging.current || e.touches.length !== 1) return;

    const deltaX = e.touches[0].clientX - previousMousePosition.current.x;
    const deltaY = e.touches[0].clientY - previousMousePosition.current.y;

    globeGroup.rotation.y += deltaX * 0.005;
    globeGroup.rotation.x += deltaY * 0.005;
    globeGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globeGroup.rotation.x));

    previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    lastInteractTime.current = Date.now();
  };

  const totalNodes = nodes.length;
  const onlineNodes = nodes.filter(n => n.status === "online").length;
  const alertNodes = nodes.filter(n => n.status === "alert").length;

  return (
    <div className="relative w-full h-full min-h-[500px]" ref={containerRef}>
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      />

      {/* Floating HTML Tooltip */}
      {hoveredNode && (
        <div
          className="absolute bg-bg-deep/95 border border-border-strong px-4 py-3 rounded-lg text-xs font-mono shadow-2xl pointer-events-none z-30 min-w-[200px] backdrop-blur-md"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="font-bold text-accent-teal border-b border-border-color pb-1 mb-1.5 flex items-center justify-between">
            <span>{hoveredNode.id}</span>
            <Badge variant={hoveredNode.status === "online" ? "teal" : hoveredNode.status === "degraded" ? "amber" : "red"}>
              {hoveredNode.status}
            </Badge>
          </div>
          <div className="space-y-1 text-text-primary">
            <div><span className="text-text-secondary">Name:</span> {hoveredNode.name}</div>
            <div><span className="text-text-secondary">Type:</span> {hoveredNode.type.toUpperCase()}</div>
            <div><span className="text-text-secondary">Coords:</span> {hoveredNode.lat.toFixed(4)}, {hoveredNode.lng.toFixed(4)}</div>
            <div><span className="text-text-secondary">Signal:</span> {hoveredNode.signal_strength}/5</div>
          </div>
        </div>
      )}

      {/* Globe Filter Overlay (top-left) */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 max-w-[calc(100%-80px)]">
        {(["all", "shore", "buoy", "vessel", "alert"] as const).map((t) => (
          <Button
            key={t}
            variant={filter === t ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
        <Button variant="secondary" size="sm" onClick={() => flyToRegion(13.08, 80.27)}>
          Locate India
        </Button>
      </div>

      {/* Node stats overlay (top-right) */}
      <div className="absolute top-4 right-4 z-20 panel-glass p-4 text-xs font-mono space-y-2 bg-bg-deep/75 backdrop-blur-md">
        <div className="text-text-secondary uppercase text-[10px] tracking-widest border-b border-border-color pb-1.5 mb-1.5 font-display font-bold">
          Globe Metrics
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-secondary">Total Nodes:</span>
          <span className="text-text-primary font-bold">{totalNodes}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-secondary">Online:</span>
          <span className="text-accent-teal font-bold">{onlineNodes}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-secondary">Alerting:</span>
          <span className={`${alertNodes > 0 ? "text-accent-red" : "text-text-muted"} font-bold`}>
            {alertNodes}
          </span>
        </div>
      </div>
    </div>
  );
};
export default ThreeGlobe;
