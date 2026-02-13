
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProteinBadge } from "./ProteinBadge";
import { PriceDisplay } from "./PriceDisplay";
import { cn } from "@/lib/utils";
import type { MealPack } from "@/types";

interface MealPackCardProps {
  pack: MealPack;
  variant?: "default" | "featured";
  className?: string;
}

export function MealPackCard({ pack, variant = "default", className }: MealPackCardProps) {
  const isFeatured = variant === "featured";
  const trialPrice = pack.pricing.trial?.[3];

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-oz-neutral/40 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        isFeatured && "border-oz-secondary border-2",
        className
      )}
      style={{ minHeight: 420 }}
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] w-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-oz-primary/10 via-oz-secondary/10 to-oz-accent/10">
        {pack.image?.url ? (
          <img
            src={pack.image.url}
            alt={pack.image.alt || pack.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">Image coming soon</div>
        )}
        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        {/* Floating badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          <ProteinBadge grams={pack.proteinPerMeal} tier={pack.tier} className="shadow-md" />
          {pack.caloriesRange && (
            <span className="inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-oz-primary shadow-sm backdrop-blur">
              {pack.caloriesRange} kcal
            </span>
          )}
        </div>
        {pack.isFeatured && (
          <span className="absolute top-3 right-3 rounded-full bg-oz-accent px-3 py-1 text-xs font-bold text-white shadow">Featured</span>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <h3 className={cn(
            "font-bold text-oz-primary text-lg md:text-xl mb-1 truncate",
            isFeatured && "text-2xl"
          )}>{pack.name}</h3>
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{pack.description}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {pack.items.slice(0, 3).map((item, idx) => (
              <span key={idx} className="text-xs bg-oz-neutral/50 text-oz-primary px-2 py-1 rounded">
                {item.name}
              </span>
            ))}
            {pack.items.length > 3 && (
              <span className="text-xs text-muted-foreground px-2 py-1">+{pack.items.length - 3} more</span>
            )}
          </div>
        </div>
        <div className="mt-auto space-y-2">
          {pack.isTrialAvailable && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Trial (3 days)</span>
              <PriceDisplay amount={trialPrice} size="sm" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Weekly</span>
            <PriceDisplay amount={pack.pricing.weekly} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-oz-primary">Monthly</span>
            <PriceDisplay amount={pack.pricing.monthly} size="md" highlight />
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="px-5 pb-5">
        <Link to={`/meal-packs/${pack.id}`} className="block w-full">
          <Button
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg bg-oz-secondary hover:bg-oz-secondary/90 transition-all duration-200 group/button shadow-md",
              isFeatured && "bg-oz-accent hover:bg-oz-accent/90"
            )}
          >
            View Details
            <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover/button:translate-x-1" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
