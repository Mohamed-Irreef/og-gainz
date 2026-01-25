import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatCurrency";

interface PriceDisplayProps {
  amount: number;
  originalAmount?: number;
  size?: "sm" | "md" | "lg" | "xl";
  highlight?: boolean;
  className?: string;
}

export function PriceDisplay({
  amount,
  originalAmount,
  size = "md",
  highlight = false,
  className,
}: PriceDisplayProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-2xl",
  };

  const hasDiscount = originalAmount && originalAmount > amount;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {hasDiscount && (
        <span className="text-muted-foreground line-through text-sm">
          {formatCurrency(originalAmount)}
        </span>
      )}
      <span
        className={cn(
          "font-semibold",
          sizeClasses[size],
          highlight ? "text-oz-accent" : "text-oz-primary"
        )}
      >
        {formatCurrency(amount)}
      </span>
    </div>
  );
}
