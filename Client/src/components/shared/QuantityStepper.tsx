import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  size = "md",
  disabled = false,
  className,
}: QuantityStepperProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const sizeClasses = {
    sm: {
      button: "h-7 w-7",
      icon: "h-3 w-3",
      text: "w-8 text-sm",
    },
    md: {
      button: "h-9 w-9",
      icon: "h-4 w-4",
      text: "w-10 text-base",
    },
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          sizeClasses[size].button,
          "rounded-full border-oz-neutral hover:bg-oz-neutral/50 hover:border-oz-secondary"
        )}
        onClick={handleDecrement}
        disabled={disabled || value <= min}
      >
        <Minus className={sizeClasses[size].icon} />
      </Button>
      <span
        className={cn(
          "text-center font-medium text-oz-primary",
          sizeClasses[size].text
        )}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          sizeClasses[size].button,
          "rounded-full border-oz-neutral hover:bg-oz-neutral/50 hover:border-oz-secondary"
        )}
        onClick={handleIncrement}
        disabled={disabled || value >= max}
      >
        <Plus className={sizeClasses[size].icon} />
      </Button>
    </div>
  );
}
