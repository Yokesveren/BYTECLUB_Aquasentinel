import React, { useState, useEffect } from "react";
import { useAlertsStore } from "../../store/alertsStore";

export const TopBar: React.FC = () => {
  const activeAlertCount = useAlertsStore((state) => state.activeCount);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatClock = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const isAlertActive = activeAlertCount > 0;

  return (
    <header className="fixed top-0 left-0 right-0 h-[60px] bg-bg-deep/90 border-b border-border-color backdrop-blur-md z-50 flex items-center justify-between px-6">
      {/* Brand logo */}
      <div className="flex items-center gap-2">
        <span className="font-display font-bold text-lg tracking-wide">
          <span className="text-accent-teal">AQUA</span>
          <span className="text-text-primary">-SENTINEL</span>
        </span>
        <span className="h-2.5 w-2.5 rounded-full bg-accent-teal pulse-teal-dot" />
      </div>

      {/* Right components */}
      <div className="flex items-center gap-6">
        {/* System Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-bg-card/50 border border-border-color text-xs">
          <span className="text-text-secondary">SYSTEM STATUS:</span>
          {isAlertActive ? (
            <span className="text-accent-red font-semibold flex items-center gap-1.5 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-red pulse-red-dot inline-block" />
              ALERT ACTIVE
            </span>
          ) : (
            <span className="text-accent-teal font-semibold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-teal pulse-teal-dot inline-block" />
              ALL SYSTEMS NOMINAL
            </span>
          )}
        </div>

        {/* Live Clock */}
        <div className="font-mono text-sm text-text-primary bg-bg-card/40 px-3 py-1 rounded border border-border-color">
          {formatClock(time)}
        </div>
      </div>
    </header>
  );
};
