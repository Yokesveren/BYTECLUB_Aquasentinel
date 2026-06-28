import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAlertsStore } from "../store/alertsStore";
import { useStatsStore } from "../store/statsStore";
import { AlertCard } from "../components/ui/AlertCard";
import { DonutChart } from "../components/charts/DonutChart";
import { BarChart } from "../components/charts/BarChart";
import { DroneDeployModal } from "../components/ui/DroneDeployModal";
import { RefreshCw, ShieldAlert, Award, FileSpreadsheet, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export const DistressFeed: React.FC = () => {
  const { alerts, loading, fetchAlerts, refreshAlertsRandom } = useAlertsStore();
  const { alertsSummary, fetchAlertsSummary } = useStatsStore();

  const [isSpinning, setIsSpinning] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deployDroneId, setDeployDroneId] = useState("");
  const [activityLogs, setActivityLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchAlerts(1, 20);
    fetchAlertsSummary();

    // Seed recent logs
    setActivityLogs([
      `[${new Date().toLocaleTimeString()}] SECURE LINK ESTABLISHED WITH SG-IND-01`,
      `[${new Date(Date.now() - 300000).toLocaleTimeString()}] AUTOPILOT DIAGNOSTIC REPORT RECOVERED FROM DR-02`,
      `[${new Date(Date.now() - 600000).toLocaleTimeString()}] WEATHER BULLETIN: SEA STATE LEVEL 2 - CALM`,
      `[${new Date(Date.now() - 900000).toLocaleTimeString()}] MESH CONFIGURATION PING DELAY: 42ms`,
      `[${new Date(Date.now() - 1200000).toLocaleTimeString()}] LORA TRANSCEIVER NOMINAL: FREQ 868.1MHz`
    ]);
  }, []);

  const handleRefresh = async () => {
    setIsSpinning(true);
    try {
      await refreshAlertsRandom();
      toast.success("Alert list randomized");
      // Add log
      setActivityLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] MANUAL DATABASE REFRESH SUCCESSFUL`,
        ...prev
      ]);
    } catch {
      toast.error("Refresh failed");
    } finally {
      setTimeout(() => setIsSpinning(false), 600);
    }
  };

  const handleDispatchDrone = (_alertId: string, _vesselId: string) => {
    // Pick the first standby drone, or default to DR-01
    setDeployDroneId("DR-01");
    setDeployModalOpen(true);
  };

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  // Card slide-in / slide-out
  const cardVariants = {
    hidden: { x: 100, opacity: 0 },
    show: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } },
    exit: { x: -100, opacity: 0, transition: { duration: 0.1 } }
  };

  const summary = alertsSummary?.summary || {
    total: 15,
    active: 2,
    falsePositives: 1,
    successfulRescues: 12,
    avgResponseTime: "12.4 min"
  };

  const donutData = alertsSummary?.donut || [
    { name: "Capsize", value: 6, color: "#e74c3c" },
    { name: "Manual SOS", value: 5, color: "#f5a623" },
    { name: "Welfare Check", value: 4, color: "#378add" }
  ];

  const barData = alertsSummary?.bar || Array.from({ length: 24 }).map((_, i) => ({
    hour: `${String(i).padStart(2, "0")}:00`,
    count: i % 4 === 0 ? 1 : 0
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 h-[calc(100vh-100px)] overflow-hidden font-sans">
      
      {/* LEFT 65%: Alerts feed */}
      <div className="lg:col-span-6 flex flex-col h-full overflow-hidden">
        <div className="flex justify-between items-center border-b border-border-color pb-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-display font-bold text-text-primary tracking-tight">
              INCOMING DISTRESS SIGNALS
            </h2>
            <span className="h-2.5 w-2.5 rounded-full bg-accent-red pulse-red-dot" />
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-color hover:border-accent-teal text-xs font-mono text-text-secondary hover:text-accent-teal bg-transparent cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${isSpinning ? "spin-600ms" : ""}`} />
            REFRESH
          </button>
        </div>

        {/* Scrollable feed container */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-44 bg-border-color/10 border border-border-color rounded-xl animate-pulse" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary gap-3">
              <AlertCircle className="h-12 w-12 text-text-muted" />
              <p className="font-mono text-xs text-text-muted uppercase">No active alerts reported in database.</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-4 pb-6"
            >
              <AnimatePresence mode="popLayout">
                {alerts.map((alert: any) => (
                  <motion.div
                    key={alert.id}
                    variants={cardVariants}
                    layout
                    exit="exit"
                  >
                    <AlertCard alert={alert} onDispatchDrone={handleDispatchDrone} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* RIGHT 35%: Stats Panel */}
      <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto pr-1">
        
        {/* Metric Summary Grid */}
        <div className="panel-glass p-5">
          <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider border-b border-border-color pb-2 mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-accent-teal" />
            Today's Response Summary
          </h3>
          <div className="grid grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-3 bg-bg-deep/40 border border-border-color/30 rounded-lg">
              <div className="text-text-secondary text-[10px] uppercase">Total signals</div>
              <div className="text-lg font-bold text-text-primary mt-1">{summary.total}</div>
            </div>
            <div className="p-3 bg-bg-deep/40 border border-border-color/30 rounded-lg">
              <div className="text-text-secondary text-[10px] uppercase">Avg Response</div>
              <div className="text-lg font-bold text-accent-teal mt-1">{summary.avgResponseTime}</div>
            </div>
            <div className="p-3 bg-bg-deep/40 border border-border-color/30 rounded-lg">
              <div className="text-text-secondary text-[10px] uppercase">False Positives</div>
              <div className="text-lg font-bold text-text-muted mt-1">{summary.falsePositives}</div>
            </div>
            <div className="p-3 bg-bg-deep/40 border border-border-color/30 rounded-lg">
              <div className="text-text-secondary text-[10px] uppercase">Successful Rescues</div>
              <div className="text-lg font-bold text-accent-blue mt-1 flex items-center gap-1">
                <Award className="h-4 w-4 text-accent-blue" />
                {summary.successfulRescues}
              </div>
            </div>
          </div>
        </div>

        {/* Donut Chart and Bar Chart */}
        <div className="panel-glass p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider border-b border-border-color pb-2 mb-2">
              Alert Types Breakdown
            </h3>
            <div className="h-44">
              <DonutChart data={donutData} />
            </div>
          </div>
          <div className="col-span-2 mt-2">
            <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider border-b border-border-color pb-2 mb-2">
              Alert Occurrence (24h)
            </h3>
            <div className="h-44">
              <BarChart data={barData} />
            </div>
          </div>
        </div>

        {/* Real-time raw log */}
        <div className="panel-glass p-5 flex-1 flex flex-col min-h-[220px]">
          <h3 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider border-b border-border-color pb-2 mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-text-secondary" />
            Recent Network activity log
          </h3>
          <div className="flex-1 overflow-y-auto bg-bg-deep/50 border border-border-color/40 p-3 rounded-lg font-mono text-[10px] text-text-secondary space-y-1.5 h-36">
            {activityLogs.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap leading-relaxed select-text">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>

      <DroneDeployModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        droneId={deployDroneId}
      />
    </div>
  );
};
export default DistressFeed;
