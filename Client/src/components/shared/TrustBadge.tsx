import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  icon: LucideIcon;
  title: string;
  description: string;
  variant?: "default" | "accent";
  className?: string;
}

export function TrustBadge({ 
  icon: Icon, 
  title, 
  description, 
  variant = "default",
  className 
}: TrustBadgeProps) {
  return (
    <div className={cn("flex items-start gap-4", className)}>
      <div
        className={cn(
          "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
          variant === "accent" 
            ? "bg-oz-accent/10 text-oz-accent" 
            : "bg-oz-secondary/10 text-oz-secondary"
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h4 className="font-semibold text-oz-primary mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
