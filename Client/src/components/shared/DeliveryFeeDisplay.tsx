import { MapPin, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatCurrency";

interface DeliveryFeeDisplayProps {
  distanceKm?: number | null;
  deliveryFee?: number | null;
  isServiceable?: boolean | null;
  reason?: string | null;
  className?: string;
  showDetails?: boolean;
}

export function DeliveryFeeDisplay({ 
  distanceKm,
  deliveryFee,
  isServiceable,
  reason,
  className,
  showDetails = true 
}: DeliveryFeeDisplayProps) {
  if (isServiceable === false) {
    return (
      <div className={cn("flex items-center gap-2 text-destructive", className)}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">
          {reason || "Outside delivery area"}
        </span>
      </div>
    );
  }

  const isFree = typeof deliveryFee === 'number' && deliveryFee === 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <MapPin className="h-4 w-4 text-oz-secondary" />
      <div className="flex items-center gap-2">
        {showDetails && (
          <span className="text-sm text-muted-foreground">
            {typeof distanceKm === 'number' ? `${distanceKm.toFixed(1)} km` : '—'}
          </span>
        )}
        {isFree ? (
          <span className="text-sm font-medium text-green-600">
            Free Delivery
          </span>
        ) : (
          <span className="text-sm font-medium text-oz-primary">
            {typeof deliveryFee === 'number' ? `${formatCurrency(deliveryFee)} delivery` : '—'}
          </span>
        )}
      </div>
    </div>
  );
}
