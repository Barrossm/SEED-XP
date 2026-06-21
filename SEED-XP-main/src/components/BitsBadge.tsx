import React from "react";
import { Zap } from "lucide-react";

const BitsBadge: React.FC<{ amount: number; size?: "sm" | "md" | "lg" }> = ({
  amount,
  size = "sm",
}) => {
  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-accent text-accent-foreground font-semibold ${sizes[size]}`}
    >
      <Zap className="w-3.5 h-3.5" fill="currentColor" />
      {amount} {amount === 1 ? "Bit" : "Bits"}
    </span>
  );
};

export default BitsBadge;