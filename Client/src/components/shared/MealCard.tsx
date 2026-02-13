import { memo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Zap } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import type { Meal } from '@/types/catalog';

type Props = {
	meal: Meal;
	priceTier?: 'weekly' | 'monthly' | 'trial';
	className?: string;
	footer?: ReactNode;
};

const getEffectivePricing = (meal: Meal) => {
	const mode = meal.proteinPricingMode || 'default';
	if (mode === 'default') return meal.pricing;
	if (mode === 'with-only') return meal.proteinPricing?.withProtein;
	if (mode === 'without-only') return meal.proteinPricing?.withoutProtein;
	// both: choose "with" by default, but fall back to "without" if needed
	return meal.proteinPricing?.withProtein || meal.proteinPricing?.withoutProtein;
};

const getEffectiveProteinPerMeal = (meal: Meal) => {
	const mode = meal.proteinPricingMode || 'default';
	if (mode === 'default') return meal.proteinPerMeal;
	if (mode === 'with-only') return meal.proteinPerMealWith ?? meal.proteinPerMeal;
	if (mode === 'without-only') return meal.proteinPerMealWithout ?? meal.proteinPerMeal;
	// both: choose "with" by default, but fall back as needed
	return meal.proteinPerMealWith ?? meal.proteinPerMealWithout ?? meal.proteinPerMeal;
};

const getTier = (meal: Meal, tier: Props['priceTier']) => {
	const pricing = getEffectivePricing(meal);
	if (!pricing) return { price: null as number | null, suffix: '' };
	if (tier === 'monthly') return { price: pricing.monthly?.price ?? null, suffix: '/ month' };
	if (tier === 'trial') return { price: pricing.trial?.price ?? null, suffix: '/ trial' };
	return { price: pricing.weekly?.price ?? null, suffix: '/ week' };
};

export const MealCard = memo(function MealCard({ meal, className, priceTier = 'weekly', footer }: Props) {
	// NOTE: keep cards uniform in height across grids.
	const tier = getTier(meal, priceTier);
	const desc = meal.shortDescription || meal.description || '';
	const primaryImage = meal.images?.[0] || meal.image;

	return (
		<Card
			className={cn(
				'group overflow-hidden rounded-2xl border-oz-neutral/60 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-within:ring-2 focus-within:ring-oz-secondary/30 flex flex-col min-h-[400px]',
				className
			)}
		>
			<div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl bg-gradient-to-br from-oz-primary/10 via-oz-secondary/10 to-oz-accent/10">
				{primaryImage?.url ? (
					<img
						src={primaryImage.url}
						alt={primaryImage.alt || meal.name}
						loading="lazy"
						className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
					/>
				) : (
					<div className="h-full w-full flex items-center justify-center">
						<div className="text-xs text-muted-foreground">Image coming soon</div>
					</div>
				)}

				{/* Subtle bottom gradient for readability */}
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

				{meal.isFeatured && (
					<div className="absolute top-3 left-3 rounded-full bg-oz-accent text-white text-xs px-3 py-1 font-medium shadow">
						Popular
					</div>
				)}
				{meal.isTrialEligible && (
					<div className="absolute top-3 right-3 rounded-full bg-oz-primary text-white text-xs px-3 py-1 font-medium shadow">
						{meal.trialBadgeText || 'Trial'}
					</div>
				)}
			</div>

			<CardContent className="p-4 sm:p-5 flex-1 flex flex-col">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h3 className="text-base sm:text-lg font-semibold text-oz-primary leading-snug line-clamp-1">{meal.name}</h3>
						<p className="mt-1 text-sm text-muted-foreground line-clamp-2">{desc}</p>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap items-center gap-2">
					<div className="inline-flex items-center gap-1.5 rounded-full bg-oz-secondary/10 text-oz-primary px-3 py-1 text-xs font-medium">
						<Zap className="h-3.5 w-3.5 text-oz-secondary" />
						{getEffectiveProteinPerMeal(meal)}g Protein
					</div>
					<div className="inline-flex items-center gap-1.5 rounded-full bg-oz-neutral/40 text-oz-primary px-3 py-1 text-xs font-medium">
						<Flame className="h-3.5 w-3.5 text-oz-accent" />
						{meal.caloriesRange || '~500 kcal'}
					</div>
				</div>

				<div className="mt-4 border-t border-oz-neutral/50" />

				<div className="mt-auto pt-4 flex items-end justify-between">
					<div className="text-xs text-muted-foreground">Starting from</div>
					<div className="text-oz-primary font-bold">
						{tier.price == null ? '—' : formatCurrency(tier.price)}
						{tier.price == null ? null : <span className="text-xs font-normal text-muted-foreground"> {tier.suffix}</span>}
					</div>
				</div>
			</CardContent>

			<CardFooter className="p-4 sm:p-5 pt-0 mt-auto">
				{footer ?? (
					<Link to={`/meal-packs/${meal.slug}`} className="w-full">
						<Button className="w-full bg-oz-secondary hover:bg-oz-secondary/90 group/btn">
							View Details
							<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
						</Button>
					</Link>
				)}
			</CardFooter>
		</Card>
	);
});
