import React, { useEffect, useState, useRef } from "react";
import api from "../lib/api";
import { Button } from "../components/ui/Button";
import { Sliders, Radio, Bell, Key, Info, Settings as SettingsIcon } from "lucide-react";
import toast from "react-hot-toast";

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"general" | "thresholds" | "network" | "notifications" | "api" | "about">("general");
  
  // Local settings state
  const [settings, setSettings] = useState<any>({
    capsize_sensitivity: 75,
    welfare_timeout: 4,
    auto_drone_dispatch: true,
    false_positive_cancel_window: 15,
    lora_frequency: 868.1,
    hop_limit: 5,
    gps_broadcast_interval: 30,
    node_offline_threshold: 10,
    notifications_email: "alerts@aquasentinel.gov",
    notifications_sms: true,
    notifications_push: true,
    notifications_sound: true
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const saveTimeout = useRef<any>(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/settings");
        // Pre-fill
        setSettings((prev: any) => ({ ...prev, ...res.data }));
      } catch (err) {
        console.error("Failed to load settings from DB:", err);
      }
    };
    fetchSettings();
  }, []);

  // Debounced Settings Saver
  const handleChange = (key: string, value: any) => {
    // If switching light mode warn
    if (key === "theme" && value === "light") {
      toast.error("Light theme degraded mode warning: Dark theme recommended for operations centers.");
      return;
    }

    setSettings((prev: any) => ({ ...prev, [key]: value }));

    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      try {
        await api.patch("/settings", { [key]: value });
        toast.success("Configuration auto-saved");
      } catch (err) {
        toast.error("Failed to save setting");
      }
    }, 600); // 600ms debounce
  };

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "thresholds", label: "Alert Thresholds", icon: Sliders },
    { id: "network", label: "Network Config", icon: Radio },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "api", label: "API Integrations", icon: Key },
    { id: "about", label: "About", icon: Info }
  ] as const;

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)] overflow-hidden font-sans">
      
      {/* LEFT SIDE: Tabs Nav */}
      <div className="w-56 flex flex-col gap-1.5 border-r border-border-color pr-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-xs font-mono transition-all ${
              activeTab === tab.id
                ? "bg-accent-teal/15 text-accent-teal border border-accent-teal/35"
                : "text-text-secondary hover:text-text-primary hover:bg-border-color/20 border border-transparent"
            }`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* RIGHT SIDE: Tab Content pane */}
      <div className="flex-1 overflow-y-auto pl-2 pr-4 pb-6">
        
        {/* GENERAL SETTINGS */}
        {activeTab === "general" && (
          <div className="space-y-6 font-mono text-xs max-w-xl">
            <h3 className="text-sm font-bold font-display text-text-primary border-b border-border-color pb-2 uppercase tracking-wider">
              General Command Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary mb-1">Command Hub Node Name</label>
                <input
                  type="text"
                  value="AQUA-SENTINEL OPERATIONS CENTER"
                  disabled
                  className="w-full px-3 py-2 bg-bg-deep/40 border border-border-color rounded-lg text-text-primary opacity-60 cursor-not-allowed focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-text-secondary mb-1">System Timezone</label>
                <select
                  value="UTC+5:30"
                  disabled
                  className="w-full px-3 py-2 bg-bg-deep/40 border border-border-color rounded-lg text-text-primary opacity-60 cursor-not-allowed focus:outline-none"
                >
                  <option value="UTC+5:30">Indian Standard Time (IST - UTC+5:30)</option>
                </select>
              </div>

              <div>
                <label className="block text-text-secondary mb-1">Display Language</label>
                <select
                  value="en"
                  disabled
                  className="w-full px-3 py-2 bg-bg-deep/40 border border-border-color rounded-lg text-text-primary opacity-60 cursor-not-allowed focus:outline-none"
                >
                  <option value="en">English (US)</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border-color/30">
                <div>
                  <div className="text-text-primary font-bold">DARK OPERATIONAL THEME</div>
                  <div className="text-[10px] text-text-secondary font-sans mt-0.5">Maintain dark night vision aesthetics for control centers.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleChange("theme", "light")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-accent-teal rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-deep after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-teal"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ALERT THRESHOLDS */}
        {activeTab === "thresholds" && (
          <div className="space-y-6 font-mono text-xs max-w-xl">
            <h3 className="text-sm font-bold font-display text-text-primary border-b border-border-color pb-2 uppercase tracking-wider">
              Alert Trigger Thresholds
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-secondary">MPU6050 Capsize Tilt Sensitivity</span>
                  <span className="text-accent-red font-bold">{settings.capsize_sensitivity} deg</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={settings.capsize_sensitivity}
                  onChange={(e) => handleChange("capsize_sensitivity", Number(e.target.value))}
                  className="w-full accent-accent-teal bg-border-color rounded-lg appearance-none h-1.5"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-secondary">Welfare Check Timeout Interval</span>
                  <span className="text-accent-teal font-bold">{settings.welfare_timeout} Hours</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={settings.welfare_timeout}
                  onChange={(e) => handleChange("welfare_timeout", Number(e.target.value))}
                  className="w-full accent-accent-teal bg-border-color rounded-lg appearance-none h-1.5"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-secondary">False Positive Acknowledge Cancel Window</span>
                  <span className="text-accent-amber font-bold">{settings.false_positive_cancel_window} Seconds</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={settings.false_positive_cancel_window}
                  onChange={(e) => handleChange("false_positive_cancel_window", Number(e.target.value))}
                  className="w-full accent-accent-teal bg-border-color rounded-lg appearance-none h-1.5"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border-color/30">
                <div>
                  <div className="text-text-primary font-bold">AUTOMATIC DRONE DISPATCH</div>
                  <div className="text-[10px] text-text-secondary font-sans mt-0.5">Automatically launch standby quadcopter when alert status hits INCOMING.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.auto_drone_dispatch === true || settings.auto_drone_dispatch === "true"}
                    onChange={(e) => handleChange("auto_drone_dispatch", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-border-color rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-deep after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-teal"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* NETWORK CONFIG */}
        {activeTab === "network" && (
          <div className="space-y-6 font-mono text-xs max-w-xl">
            <h3 className="text-sm font-bold font-display text-text-primary border-b border-border-color pb-2 uppercase tracking-wider">
              Mesh Network Radio Config
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary mb-1">LoRa Frequency Band (MHz)</label>
                <select
                  value={settings.lora_frequency}
                  onChange={(e) => handleChange("lora_frequency", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
                >
                  <option value="868.1">868.1 MHz (EU-ISM Band)</option>
                  <option value="915.0">915.0 MHz (US-ISM Band)</option>
                  <option value="433.0">433.0 MHz (Asia-ISM Band)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-secondary">Maximum Router Hop Limit</span>
                  <span className="text-accent-teal font-bold">{settings.hop_limit} Hops</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.hop_limit}
                  onChange={(e) => handleChange("hop_limit", Number(e.target.value))}
                  className="w-full accent-accent-teal bg-border-color rounded-lg appearance-none h-1.5"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-secondary">Vessel GPS Broadcast Interval</span>
                  <span className="text-accent-teal font-bold">{settings.gps_broadcast_interval} Seconds</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  value={settings.gps_broadcast_interval}
                  onChange={(e) => handleChange("gps_broadcast_interval", Number(e.target.value))}
                  className="w-full accent-accent-teal bg-border-color rounded-lg appearance-none h-1.5"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-secondary">Node Offline Timeout Threshold</span>
                  <span className="text-accent-amber font-bold">{settings.node_offline_threshold} Minutes</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={settings.node_offline_threshold}
                  onChange={(e) => handleChange("node_offline_threshold", Number(e.target.value))}
                  className="w-full accent-accent-teal bg-border-color rounded-lg appearance-none h-1.5"
                />
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="space-y-6 font-mono text-xs max-w-xl">
            <h3 className="text-sm font-bold font-display text-text-primary border-b border-border-color pb-2 uppercase tracking-wider">
              Emergency Alerts Broadcast
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary mb-1">Recipient Alert Email Address</label>
                <input
                  type="email"
                  value={settings.notifications_email}
                  onChange={(e) => handleChange("notifications_email", e.target.value)}
                  className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border-color/30">
                <div>
                  <div className="text-text-primary font-bold">EMAIL NOTIFICATIONS</div>
                  <div className="text-[10px] text-text-secondary font-sans mt-0.5">Send full details telemetry email on alert.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-accent-teal/50 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[18px] after:bg-bg-deep after:rounded-full after:h-4 after:w-4 opacity-50 cursor-not-allowed"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border-color/30">
                <div>
                  <div className="text-text-primary font-bold">SMS NOTIFICATIONS</div>
                  <div className="text-[10px] text-text-secondary font-sans mt-0.5">SMS text summary alerts directly to coast guards cell.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications_sms === true || settings.notifications_sms === "true"}
                    onChange={(e) => handleChange("notifications_sms", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-border-color rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-deep after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-teal"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border-color/30">
                <div>
                  <div className="text-text-primary font-bold">SOUND CHIME WARNINGS</div>
                  <div className="text-[10px] text-text-secondary font-sans mt-0.5">Chime alarm sirens through command audio nodes.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications_sound === true || settings.notifications_sound === "true"}
                    onChange={(e) => handleChange("notifications_sound", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-border-color rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-deep after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-teal"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* API INTEGRATIONS */}
        {activeTab === "api" && (
          <div className="space-y-6 font-mono text-xs max-w-xl">
            <h3 className="text-sm font-bold font-display text-text-primary border-b border-border-color pb-2 uppercase tracking-wider">
              External Gateway Integrations
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary mb-1">Twilio API Key Credentials</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value="SK-8419f012b59128f731290bbffcce1204"
                    disabled
                    className="w-full px-3 py-2 pr-12 bg-bg-deep/40 border border-border-color rounded-lg text-text-primary opacity-60 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-text-secondary hover:text-accent-teal text-[10px] font-bold"
                  >
                    {showApiKey ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-text-secondary mb-1">SendGrid SMTP Dispatch Pass</label>
                <input
                  type="password"
                  value="••••••••••••••••••••••••••••••••"
                  disabled
                  className="w-full px-3 py-2 bg-bg-deep/40 border border-border-color rounded-lg text-text-primary opacity-60 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ABOUT */}
        {activeTab === "about" && (
          <div className="space-y-6 font-mono text-xs max-w-2xl leading-relaxed text-text-secondary">
            <h3 className="text-sm font-bold font-display text-text-primary border-b border-border-color pb-2 uppercase tracking-wider">
              System Specifications
            </h3>
            <div className="space-y-3">
              <p>
                <span className="text-text-primary font-bold">AQUA-SENTINEL Dashboard v2.4.0</span>
              </p>
              <p>
                This application represents a comprehensive, production-grade maritime mesh emergency responder, built for the{" "}
                <span className="text-accent-teal font-bold">Coastal Innovation Hackathon — Smart & Sustainable Cities Track</span>.
              </p>
              <p>
                The system utilizes low-power long-range LoRa hardware mesh topologies linked to autonomous drone payload deployment platforms, minimizing emergency responder latency in deep-sea environments.
              </p>
              <div className="border-t border-border-color/30 pt-3 mt-4 space-y-1">
                <div>&bull; Build Date: June 27, 2026</div>
                <div>&bull; Stack: Node.js Express TS, better-sqlite3, React 18 Vite TS, Tailwind CSS</div>
                <div>&bull; 3D Engine: WebGL raw Three.js renderer</div>
              </div>
              <div className="pt-4">
                <Button variant="outline" size="sm" onClick={() => window.open("https://github.com")}>
                  VIEW GITHUB REPOSITORY
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default Settings;
