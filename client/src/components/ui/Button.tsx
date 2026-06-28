import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "warning" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.02] hover:brightness-110";
  
  const variants = {
    primary: "bg-accent-teal text-bg-deep font-semibold shadow-[0_0_12px_rgba(0,212,170,0.15)]",
    secondary: "bg-accent-blue text-text-primary font-semibold shadow-[0_0_12px_rgba(55,138,221,0.15)]",
    danger: "bg-accent-red text-text-primary font-semibold shadow-[0_0_12px_rgba(231,76,60,0.15)]",
    warning: "bg-accent-amber text-bg-deep font-semibold shadow-[0_0_12px_rgba(245,166,35,0.15)]",
    outline: "border border-border-color hover:border-accent-teal text-text-secondary hover:text-accent-teal bg-transparent"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};
