import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  Globe,
  AlertTriangle,
  Ship,
  Navigation,
  Radio,
  Settings as SettingsIcon
} from "lucide-react";
import { useAlertsStore } from "../../store/alertsStore";

export const Sidebar: React.FC = () => {
  const activeAlertCount = useAlertsStore((state) => state.activeCount);

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/map", label: "Live Map", icon: Map },
    { to: "/globe", label: "Globe View", icon: Globe },
    { to: "/alerts", label: "Distress Feed", icon: AlertTriangle, badge: activeAlertCount },
    { to: "/fleet", label: "Fleet Manager", icon: Ship },
    { to: "/drones", label: "Drone Control", icon: Navigation },
    { to: "/network", label: "Node Network", icon: Radio },
    { to: "/settings", label: "Settings", icon: SettingsIcon }
  ];

  return (
    <aside className="group fixed top-[60px] left-0 h-[calc(100vh-60px)] w-16 hover:w-56 transition-all duration-300 ease-in-out z-40 sidebar-glass flex flex-col justify-between py-4 overflow-x-hidden">
      <nav className="flex flex-col gap-2 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-150 ${
                isActive
                  ? "bg-accent-teal/15 text-accent-teal border border-accent-teal/30"
                  : "text-text-secondary hover:text-text-primary hover:bg-border-color/20 border border-transparent"
              }`
            }
          >
            <div className="relative">
              <item.icon className="h-5 w-5 shrink-0" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-accent-red text-text-primary text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center pulse-red-dot">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="font-medium text-sm transition-opacity duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap">
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>
      <div className="px-4 text-center group-hover:block hidden">
        <span className="text-[10px] text-text-muted font-mono whitespace-nowrap">v2.4.0 MESH SYS</span>
      </div>
    </aside>
  );
};
