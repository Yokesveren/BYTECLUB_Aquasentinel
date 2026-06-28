import React, { useEffect, useRef, useState } from "react";
import { useDronesStore } from "../../store/dronesStore";

export const DroneFlightCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { flightAnimation, endFlightAnimation } = useDronesStore();
  const [eta, setEta] = useState(3);

  useEffect(() => {
    if (!flightAnimation.active || !flightAnimation.targetScreenPos) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle resizing
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const startX = canvas.width / 2;
    const startY = canvas.height - 100;
    const endX = flightAnimation.targetScreenPos.x;
    const endY = flightAnimation.targetScreenPos.y;
    // Control point for Bezier curve
    const ctrlX = canvas.width / 2 + 80;
    const ctrlY = canvas.height / 2;

    const startTime = performance.now();
    const duration = 4000; // 4 seconds total
    let animationId: number;

    // Helper for quadratic bezier coordinates
    const getBezierPoint = (t: number) => {
      const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ctrlX + t * t * endX;
      const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * ctrlY + t * t * endY;
      return { x, y };
    };

    // Helper for tangent angle at t
    const getBezierAngle = (t: number) => {
      // Derivative of bezier
      const dx = 2 * (1 - t) * (ctrlX - startX) + 2 * t * (endX - ctrlX);
      const dy = 2 * (1 - t) * (ctrlY - startY) + 2 * t * (endY - ctrlY);
      return Math.atan2(dy, dx);
    };

    const drawDrone = (c: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, rotorAngle: number) => {
      c.save();
      c.translate(x, y);
      c.rotate(angle + Math.PI / 2); // Orient drone facing direction of travel

      // Quadcopter Arms
      c.strokeStyle = "#f5a623";
      c.lineWidth = 4;
      c.beginPath();
      // Arm 1 to 4
      c.moveTo(-size / 2, -size / 2);
      c.lineTo(size / 2, size / 2);
      c.moveTo(size / 2, -size / 2);
      c.lineTo(-size / 2, size / 2);
      c.stroke();

      // Main Body Node
      c.fillStyle = "#07101f";
      c.strokeStyle = "#f5a623";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, size / 4, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Rotors spinning at ends of arms
      const armLength = size / 2;
      const rotorPositions = [
        { rx: -armLength, ry: -armLength },
        { rx: armLength, ry: armLength },
        { rx: armLength, ry: -armLength },
        { rx: -armLength, ry: armLength }
      ];

      c.fillStyle = "rgba(0, 212, 170, 0.7)";
      rotorPositions.forEach((pos) => {
        c.save();
        c.translate(pos.rx, pos.ry);
        c.rotate(rotorAngle);
        // Draw 2 blades
        c.beginPath();
        c.ellipse(0, 0, 10, 2, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      });

      c.restore();
    };

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const tTotal = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let currentX = startX;
      let currentY = startY;
      let currentAngle = 0;
      const size = 40;
      const rotorSpeed = elapsed * 0.05;

      if (tTotal < 0.125) {
        // Phase 1 (0–0.5s): Fade in at start
        const tFade = tTotal / 0.125; // 0 to 1
        ctx.globalAlpha = tFade;
        drawDrone(ctx, startX, startY, -Math.PI / 2, size, rotorSpeed);
        setEta(3);
      } 
      else if (tTotal < 0.75) {
        // Phase 2 (0.5–3.0s): Fly along Bezier curve
        const tFlight = (tTotal - 0.125) / 0.625; // 0 to 1
        const pt = getBezierPoint(tFlight);
        currentX = pt.x;
        currentY = pt.y;
        currentAngle = getBezierAngle(tFlight);

        // Update ETA countdown overlay
        setEta(Math.max(1, 3 - Math.floor(tFlight * 3)));

        ctx.globalAlpha = 1;

        // Draw Speed Lines radiating behind the drone
        ctx.strokeStyle = "rgba(245, 166, 35, 0.25)";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const offset = (i - 1.5) * 8;
          ctx.beginPath();
          ctx.moveTo(currentX - Math.cos(currentAngle) * 40 + Math.sin(currentAngle) * offset, currentY - Math.sin(currentAngle) * 40 - Math.cos(currentAngle) * offset);
          ctx.lineTo(currentX - Math.cos(currentAngle) * 120 + Math.sin(currentAngle) * offset, currentY - Math.sin(currentAngle) * 120 - Math.cos(currentAngle) * offset);
          ctx.stroke();
        }

        // Draw Motion Blur Trail (5 ghost copies)
        for (let i = 1; i <= 5; i++) {
          const tGhost = Math.max(0, tFlight - i * 0.03);
          const ghostPt = getBezierPoint(tGhost);
          const ghostAngle = getBezierAngle(tGhost);
          ctx.globalAlpha = 0.35 / i;
          drawDrone(ctx, ghostPt.x, ghostPt.y, ghostAngle, size, rotorSpeed);
        }

        ctx.globalAlpha = 1;
        drawDrone(ctx, currentX, currentY, currentAngle, size, rotorSpeed);
      } 
      else {
        // Phase 3 (3–4s): Arrive at target, red pulse ring expands
        const tArrival = (tTotal - 0.75) / 0.25; // 0 to 1
        setEta(0);

        // Expand 3 concentric circles fading out
        ctx.globalAlpha = 1 - tArrival;
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const radius = (tArrival * 60 + i * 20) % 80;
          ctx.beginPath();
          ctx.arc(endX, endY, radius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw Static Drone at target
        ctx.globalAlpha = 1;
        drawDrone(ctx, endX, endY, 0, size, rotorSpeed);

        // Show "DRONE ON SITE" text
        ctx.fillStyle = "#00d4aa";
        ctx.font = "bold 13px 'JetBrains Mono'";
        ctx.textAlign = "center";
        ctx.fillText("DRONE ON SITE", endX, endY - 35);
      }

      if (tTotal < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        // Fade out canvas and end animation state
        let fadeVal = 1;
        const fadeInterval = setInterval(() => {
          fadeVal -= 0.1;
          if (canvas) {
            canvas.style.opacity = String(fadeVal);
          }
          if (fadeVal <= 0) {
            clearInterval(fadeInterval);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.opacity = "1";
            endFlightAnimation();
          }
        }, 30);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [flightAnimation.active, flightAnimation.targetScreenPos, endFlightAnimation]);

  if (!flightAnimation.active) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none w-screen h-screen">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* ETA HUD overlay at bottom center */}
      {eta > 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-bg-deep/80 border border-accent-amber/40 text-accent-amber px-4 py-2 rounded-full font-mono text-xs shadow-lg backdrop-blur-md flex items-center gap-2 select-none">
          <span className="h-2 w-2 rounded-full bg-accent-amber animate-ping" />
          INTERCEPTING VESSEL: ETA {eta}s
        </div>
      )}
    </div>
  );
};
