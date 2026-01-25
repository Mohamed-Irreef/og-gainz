import { cn } from "@/lib/utils";
import type { PackTier } from "@/types";

interface ProteinBadgeProps {
  grams: number;
  tier?: PackTier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const tierColors: Record<PackTier, string> = {
  signature: "bg-oz-secondary/10 text-oz-secondary border-oz-secondary/30",
  elite: "bg-oz-primary/10 text-oz-primary border-oz-primary/30",
  royal: "bg-oz-accent/10 text-oz-accent border-oz-accent/30",
};

export function ProteinBadge({ grams, tier = "signature", size = "md", className }: ProteinBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        tierColors[tier],
        sizeClasses[size],
        className
      )}
    >
      {grams}g protein
    </span>
  );
}
