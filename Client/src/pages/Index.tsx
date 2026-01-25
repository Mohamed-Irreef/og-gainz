// OG GAINZ Landing Page
import { useEffect, useMemo, useState } from 'react';
import { Link } from "react-router-dom";
import { ArrowRight, Utensils, Truck, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustBadge } from "@/components/shared/TrustBadge";
import { mealsCatalogService } from '@/services/mealsCatalogService';
import type { Meal } from '@/types/catalog';
import { MealCard } from '@/components/shared/MealCard';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingMeals(true);

    mealsCatalogService
      .listMeals({ page: 1, limit: 3 }, { signal: controller.signal })
      .then((res) => setMeals(res.data))
      .catch((err) => {
        if ((err as { name?: string } | undefined)?.name === 'CanceledError') return;
        setMeals([]);
      })
      .finally(() => setLoadingMeals(false));

    return () => controller.abort();
  }, []);

  const heroMeals = useMemo(() => meals.slice(0, 3), [meals]);

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-oz-primary to-oz-primary/90 text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Precision Nutrition for Your{" "}
              <span className="text-oz-accent">Fitness Journey</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Fresh, macro-balanced meals delivered daily. Fuel your gains with 
              35-50g protein per meal.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/meal-packs">
                <Button size="lg" className="bg-oz-accent hover:bg-oz-accent/90 text-white">
                  Explore Meal Packs
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/trial">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Try 3-Day Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-white border-b border-oz-neutral">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <TrustBadge icon={Utensils} title="Fresh Daily" description="Prepared fresh every morning" />
            <TrustBadge icon={Truck} title="Free Delivery" description="Free within 5 km" variant="accent" />
            <TrustBadge icon={Clock} title="Flexible Plans" description="Pause or skip anytime" />
            <TrustBadge icon={Shield} title="Quality Guaranteed" description="100% satisfaction" variant="accent" />
          </div>
        </div>
      </section>

      {/* Featured Packs */}
      <section className="py-16 bg-oz-neutral/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-oz-primary mb-4">Our Meal Packs</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Carefully crafted for specific fitness goals with precise macro calculations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
			{loadingMeals
				? Array.from({ length: 3 }).map((_, idx) => (
					<div key={idx} className="rounded-xl overflow-hidden bg-white border border-oz-neutral/60">
						<Skeleton className="aspect-[4/3] w-full" />
						<div className="p-5 space-y-3">
							<Skeleton className="h-5 w-3/4" />
							<Skeleton className="h-4 w-full" />
							<div className="flex gap-2">
								<Skeleton className="h-6 w-28 rounded-full" />
								<Skeleton className="h-6 w-32 rounded-full" />
							</div>
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
				))
				: heroMeals.map((meal) => <MealCard key={meal.id} meal={meal} />)}
          </div>
          <div className="text-center">
            <Link to="/meal-packs">
              <Button variant="outline" size="lg" className="border-oz-secondary text-oz-secondary hover:bg-oz-secondary/5">
                View All Packs <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-oz-secondary">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Nutrition?</h2>
          <p className="text-white/80 mb-8">Start with a risk-free trial. No commitment, cancel anytime.</p>
          <Link to="/trial">
            <Button size="lg" className="bg-oz-accent hover:bg-oz-accent/90 text-white">
              Start Your Trial Today <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
