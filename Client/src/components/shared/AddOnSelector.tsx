import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { QuantityStepper } from "./QuantityStepper";
import { PriceDisplay } from "./PriceDisplay";
import { cn } from "@/lib/utils";
import type { AddOn } from "@/types";

interface AddOnSelectorProps {
  addOn: AddOn;
  onAdd: (addOn: AddOn, quantity: number, isSubscription: boolean) => void;
  className?: string;
}

export function AddOnSelector({ addOn, onAdd, className }: AddOnSelectorProps) {
  const [quantity, setQuantity] = useState(1);
  const [isSubscription, setIsSubscription] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const currentPrice = isSubscription ? addOn.priceSubscription : addOn.priceOneTime;

  const handleAdd = () => {
    onAdd(addOn, quantity, isSubscription);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const getCategoryEmoji = () => {
    switch (addOn.category) {
      case "protein": return "🍗";
      case "shakes": return "🥤";
      case "sides": return "🥗";
      case "snacks": return "🥜";
      default: return "🍽️";
    }
  };

  const hasDiscount = addOn.priceSubscription < addOn.priceOneTime;
  const discountPercent = hasDiscount 
    ? Math.round((1 - addOn.priceSubscription / addOn.priceOneTime) * 100) 
    : 0;

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start gap-4">
        {/* Image/Icon Placeholder */}
        <div className="w-16 h-16 rounded-lg bg-oz-neutral/50 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">{getCategoryEmoji()}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h4 className="font-medium text-oz-primary">{addOn.name}</h4>
              <p className="text-xs text-muted-foreground capitalize">{addOn.category}</p>
            </div>
            <PriceDisplay amount={currentPrice * quantity} size="sm" highlight />
          </div>

          {/* Subscription Toggle */}
          <div className="flex items-center gap-2 mb-3">
            <Switch
              id={`sub-${addOn.id}`}
              checked={isSubscription}
              onCheckedChange={setIsSubscription}
              className="data-[state=checked]:bg-oz-secondary"
            />
            <Label 
              htmlFor={`sub-${addOn.id}`} 
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Add to subscription {hasDiscount && "(Save "}
              {hasDiscount && (
                <span className="text-oz-accent font-medium">
                  {discountPercent}%
                </span>
              )}
              {hasDiscount && ")"}
            </Label>
          </div>

          {/* Quantity & Add */}
          <div className="flex items-center justify-between">
            <QuantityStepper
              value={quantity}
              min={1}
              max={10}
              onChange={setQuantity}
              size="sm"
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isAdded || !addOn.isAvailable}
              className={cn(
                "transition-all",
                isAdded 
                  ? "bg-green-600 hover:bg-green-600" 
                  : "bg-oz-accent hover:bg-oz-accent/90"
              )}
            >
              {isAdded ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Added
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
