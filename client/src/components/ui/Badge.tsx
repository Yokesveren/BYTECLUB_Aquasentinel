import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "teal" | "blue" | "amber" | "red" | "gray";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "blue", className = "" }) => {
  const styles = {
    teal: "bg-accent-teal/15 text-accent-teal border-accent-teal/30",
    blue: "bg-accent-blue/15 text-accent-blue border-accent-blue/30",
    amber: "bg-accent-amber/15 text-accent-amber border-accent-amber/30",
    red: "bg-accent-red/15 text-accent-red border-accent-red/30",
    gray: "bg-text-secondary/15 text-text-secondary border-text-secondary/30"
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border font-mono uppercase tracking-wider ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};
