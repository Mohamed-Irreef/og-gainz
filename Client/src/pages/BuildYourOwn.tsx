import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	AlertCircle,
	ArrowLeft,
	Check,
	Image as ImageIcon,
	Minus,
	Plus,
	Sparkles,
	Trash2,
	ShoppingCart,
	Flame,
	Dumbbell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildYourOwnCatalogService } from '@/services/buildYourOwnCatalogService';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import type {
	BuildYourOwnConfig,
	BuildYourOwnItemEntity,
	BuildYourOwnItemTypeEntity,
	BuildYourOwnPurchaseMode,
	BuildYourOwnQuote,
} from '@/types/buildYourOwn';
import { formatCurrency } from '@/utils/formatCurrency';

const MODE_STORAGE_KEY = 'og.byob.mode';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const formatQtyUnit = (value: number, unit: string) => `${value}${unit}`;

const getRemainingToMinimum = (quote: BuildYourOwnQuote | null) => {
	if (!quote) return 0;
	return Math.max(0, (quote.minimumRequired || 0) - (quote.total || 0));
};

function useAnimatedNumber(value: number, opts?: { durationMs?: number }) {
	const durationMs = opts?.durationMs ?? 350;
	const [display, setDisplay] = useState(value);
	const rafRef = useRef<number | null>(null);
	const startRef = useRef<number | null>(null);
	const fromRef = useRef(value);
	const toRef = useRef(value);

	useEffect(() => {
		fromRef.current = display;
		toRef.current = value;
		startRef.current = null;
		if (rafRef.current) cancelAnimationFrame(rafRef.current);

		const step = (t: number) => {
			if (startRef.current == null) startRef.current = t;
			const elapsed = t - startRef.current;
			const p = clamp(elapsed / durationMs, 0, 1);
			// easeOutCubic
			const eased = 1 - Math.pow(1 - p, 3);
			const next = fromRef.current + (toRef.current - fromRef.current) * eased;
			setDisplay(next);
			if (p < 1) rafRef.current = requestAnimationFrame(step);
		};

		rafRef.current = requestAnimationFrame(step);
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	return display;
}

function QuantityStepper({
	value,
	onChange,
	disabled,
	label,
}: {
	value: number;
	onChange: (next: number) => void;
	disabled?: boolean;
	label: string;
}) {
	const [shake, setShake] = useState(false);
	const holdRef = useRef<number | null>(null);
	const holdStartRef = useRef<number | null>(null);

	const stopHold = () => {
		if (holdRef.current) window.clearInterval(holdRef.current);
		holdRef.current = null;
		holdStartRef.current = null;
	};

	const bumpShake = () => {
		setShake(true);
		window.setTimeout(() => setShake(false), 250);
	};

	const change = (delta: number) => {
		if (disabled) return;
		const next = Math.max(0, value + delta);
		if (next === value && delta < 0) bumpShake();
		onChange(next);
	};

	const startHold = (delta: number) => {
		if (disabled) return;
		change(delta);
		if (holdRef.current) stopHold();
		holdStartRef.current = Date.now();
		holdRef.current = window.setInterval(() => {
			const elapsed = Date.now() - (holdStartRef.current || Date.now());
			// speed up slightly over time
			const stepDelta = delta;
			if (elapsed > 1200) {
				change(stepDelta);
				change(stepDelta);
				return;
			}
			change(stepDelta);
		}, 140);
	};

	useEffect(() => () => stopHold(), []);

	return (
		<div className="flex items-center gap-2">
			<div className={shake ? 'animate-[shake_250ms_ease-in-out]' : ''}>
				<Button
					variant="outline"
					size="icon"
					className="h-11 w-11 sm:h-9 sm:w-9"
					disabled={disabled || value === 0}
					onMouseDown={() => startHold(-1)}
					onMouseUp={stopHold}
					onMouseLeave={stopHold}
					onTouchStart={() => startHold(-1)}
					onTouchEnd={stopHold}
					aria-label={`${label}: decrease`}
				>
					<Minus className="h-4 w-4" />
				</Button>
			</div>
			<div className="w-10 text-center font-semibold text-oz-primary" aria-label={`${label}: quantity`}>
				{value}
			</div>
			<Button
				variant="outline"
				size="icon"
				className="h-11 w-11 sm:h-9 sm:w-9"
				disabled={disabled}
				onMouseDown={() => startHold(1)}
				onMouseUp={stopHold}
				onMouseLeave={stopHold}
				onTouchStart={() => startHold(1)}
				onTouchEnd={stopHold}
				aria-label={`${label}: increase`}
			>
				<Plus className="h-4 w-4" />
			</Button>
		</div>
	);
}

function TrayPreview({
	itemTypes,
	items,
	selections,
}: {
	itemTypes: BuildYourOwnItemTypeEntity[];
	items: BuildYourOwnItemEntity[];
	selections: Record<string, number>;
}) {
	const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
	const typesById = useMemo(() => new Map(itemTypes.map((t) => [t.id, t])), [itemTypes]);

	const groupedSelected = useMemo(() => {
		const groups = new Map<string, Array<{ item: BuildYourOwnItemEntity; qty: number }>>();
		for (const [itemId, qty] of Object.entries(selections)) {
			if (!qty) continue;
			const item = itemById.get(itemId);
			if (!item) continue;
			const typeId = item.itemTypeId;
			const arr = groups.get(typeId) || [];
			arr.push({ item, qty });
			groups.set(typeId, arr);
		}
		for (const [k, arr] of groups.entries()) {
			arr.sort((a, b) => (a.item.displayOrder ?? 0) - (b.item.displayOrder ?? 0));
			groups.set(k, arr);
		}
		return groups;
	}, [selections, itemById]);

	const hasAny = useMemo(() => Object.values(selections).some((q) => q > 0), [selections]);

	return (
		<Card className="border-oz-neutral/40 bg-white">
			<CardHeader className="pb-3">
				<CardTitle className="text-oz-primary">Your Meal Tray</CardTitle>
				<div className="text-sm text-muted-foreground">See your meal build come to life as you add ingredients.</div>
			</CardHeader>
			<CardContent>
				<div className="relative overflow-hidden rounded-2xl border border-oz-neutral/50 bg-gradient-to-b from-white to-oz-neutral/10 p-3 sm:p-4">
					<div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.08),transparent_55%)]" />
					<div className="relative">
						{!hasAny ? (
								<div className="flex items-center justify-between gap-4">
								<div className="min-w-0">
										<div className="font-semibold text-oz-primary">Start building your meal</div>
										<div className="text-sm text-muted-foreground mt-1">Add ingredients below — they’ll appear here grouped by category.</div>
								</div>
									<div className="h-12 w-12 rounded-2xl bg-oz-secondary/10 flex items-center justify-center border border-oz-secondary/15 shadow-sm">
									<Sparkles className="h-6 w-6 text-oz-secondary" />
								</div>
							</div>
						) : (
							<div className="space-y-3 sm:space-y-4">
								{[...groupedSelected.entries()]
									.sort((a, b) => (typesById.get(a[0])?.displayOrder ?? 0) - (typesById.get(b[0])?.displayOrder ?? 0))
									.map(([typeId, entries]) => {
										const t = typesById.get(typeId);
										return (
											<div key={typeId}>
												<div className="text-xs font-semibold text-oz-primary/80 uppercase tracking-wide">
													{t?.name || 'Ingredients'}
												</div>
												<div className="mt-2 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
														{entries.map(({ item, qty }) => (
														<div
																key={`${item.id}-${qty}`}
																className="group/tray relative h-12 w-12 rounded-full border border-oz-neutral/60 bg-white shadow-sm overflow-hidden transition-transform duration-200 animate-in fade-in zoom-in-95"
															title={`${item.name} ×${qty}`}
														>
															{item.image?.url ? (
																<img src={item.image.url} alt={item.image.alt || item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover/tray:scale-[1.05]" loading="lazy" />
															) : (
																<div className="h-full w-full flex items-center justify-center">
																	<ImageIcon className="h-4 w-4 text-muted-foreground" />
																</div>
															)}
															<span className="absolute -top-1 -right-1 rounded-full bg-oz-primary text-white text-[11px] font-bold px-1.5 py-0.5 shadow">
																{qty}
															</span>
														</div>
													))}
												</div>
											</div>
										);
									})}
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export default function BuildYourOwn() {
	const { addItem } = useCart();
	const { toast } = useToast();
	const [itemTypes, setItemTypes] = useState<BuildYourOwnItemTypeEntity[]>([]);
	const [items, setItems] = useState<BuildYourOwnItemEntity[]>([]);
	const [config, setConfig] = useState<BuildYourOwnConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [activeTab, setActiveTab] = useState<string>('');
	const [mode, setMode] = useState<BuildYourOwnPurchaseMode>(() => {
		// Persist within the SPA session only; do not restore after a full page reload.
		const saved = window.sessionStorage.getItem(MODE_STORAGE_KEY);
		return saved === 'single' || saved === 'weekly' || saved === 'monthly' ? saved : 'weekly';
	});
	const [selections, setSelections] = useState<Record<string, number>>({});
	const [justAdded, setJustAdded] = useState(false);

	const [quote, setQuote] = useState<BuildYourOwnQuote | null>(null);
	const [quoteLoading, setQuoteLoading] = useState(false);
	const quoteDebounceRef = useRef<number | null>(null);

	useEffect(() => {
		window.sessionStorage.setItem(MODE_STORAGE_KEY, mode);
	}, [mode]);

	useEffect(() => {
		// Clear mode on full reload/refresh to match UX requirement.
		const clear = () => window.sessionStorage.removeItem(MODE_STORAGE_KEY);
		window.addEventListener('beforeunload', clear);
		window.addEventListener('pagehide', clear);
		return () => {
			window.removeEventListener('beforeunload', clear);
			window.removeEventListener('pagehide', clear);
		};
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError(null);
		Promise.all([
			buildYourOwnCatalogService.listItemTypes({ signal: controller.signal }),
			buildYourOwnCatalogService.listItems({ signal: controller.signal }),
			buildYourOwnCatalogService.getConfig({ signal: controller.signal }),
		])
			.then(([typesRes, itemsRes, cfgRes]) => {
				setItemTypes(typesRes.data);
				setItems(itemsRes.data);
				setConfig(cfgRes.data);
				const activeTypes = typesRes.data.filter((t) => t.isActive !== false && !t.deletedAt);
				if (!activeTab && activeTypes.length > 0) setActiveTab(activeTypes[0].id);
			})
			.catch((e) => setError(e instanceof Error ? e.message : 'Failed to load Build-your-own catalog'))
			.finally(() => setLoading(false));

		return () => controller.abort();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const activeItemTypes = useMemo(() => {
		return [...itemTypes]
			.filter((t) => t.isActive !== false && !t.deletedAt)
			.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
	}, [itemTypes]);

	const activeItems = useMemo(() => {
		return items.filter((i) => i.isActive !== false && !i.deletedAt && i.itemTypeRef?.isActive !== false);
	}, [items]);

	const byType = useMemo(() => {
		const groups = new Map<string, BuildYourOwnItemEntity[]>();
		for (const t of activeItemTypes) groups.set(t.id, []);
		for (const item of activeItems) {
			const arr = groups.get(item.itemTypeId) || [];
			arr.push(item);
			groups.set(item.itemTypeId, arr);
		}
		for (const [k, arr] of groups.entries()) {
			arr.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
			groups.set(k, arr);
		}
		return groups;
	}, [activeItems, activeItemTypes]);

	const selectionList = useMemo(() => {
		return Object.entries(selections)
			.filter(([, q]) => q > 0)
			.map(([itemId, quantity]) => ({ itemId, quantity }));
	}, [selections]);

	useEffect(() => {
		const controller = new AbortController();
		if (quoteDebounceRef.current) window.clearTimeout(quoteDebounceRef.current);
		setQuoteLoading(true);
		quoteDebounceRef.current = window.setTimeout(() => {
			buildYourOwnCatalogService
				.quote({ mode, selections: selectionList }, { signal: controller.signal })
				.then((res) => setQuote(res.data))
				.catch((e) => {
					if (e?.name === 'CanceledError') return;
				})
				.finally(() => setQuoteLoading(false));
		}, 250);

		return () => {
			controller.abort();
			if (quoteDebounceRef.current) window.clearTimeout(quoteDebounceRef.current);
		};
	}, [mode, selectionList]);

	const hasSelections = useMemo(() => Object.values(selections).some((q) => q > 0), [selections]);
	const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

	const selectedDetails = useMemo(() => {
		const lines = quote?.lineItems || [];
		return lines
			.map((l) => {
				const item = itemById.get(l.itemId);
				if (!item) return null;
				return { itemId: l.itemId, name: item.name, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal };
			})
			.filter((x): x is NonNullable<typeof x> => Boolean(x));
	}, [quote?.lineItems, itemById]);

	const updateQty = (itemId: string, delta: number) => {
		setSelections((prev) => {
			const current = prev[itemId] || 0;
			const nextQty = Math.max(0, current + delta);
			if (nextQty === 0) {
				const { [itemId]: _, ...rest } = prev;
				return rest;
			}
			return { ...prev, [itemId]: nextQty };
		});
	};

	const totalAnimated = useAnimatedNumber(quote?.total || 0);
	const proteinAnimated = useAnimatedNumber(quote?.proteinGrams || 0);
	const caloriesAnimated = useAnimatedNumber(typeof quote?.calories === 'number' ? quote.calories : 0);

	const Summary = (
		<Card className="border-oz-neutral/40 bg-white/95 backdrop-blur">
			<CardHeader className="pb-3">
				<CardTitle className="text-oz-primary">Live Summary</CardTitle>
				<div className="text-xs text-muted-foreground">Totals and minimums are computed by the server.</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="rounded-2xl border bg-oz-neutral/5 p-4">
					<div className="flex items-start justify-between gap-3">
						<div>
							<div className="text-xs text-muted-foreground">Mode</div>
							<div className="mt-1 font-semibold text-oz-primary">
								{mode === 'single' ? 'Single order' : mode === 'weekly' ? 'Weekly subscription' : 'Monthly subscription'}
							</div>
							<div className="text-[11px] text-muted-foreground mt-1">
								{mode === 'single' ? 'One-time purchase.' : 'Per-period subscription total. Servings shown in cart/checkout.'}
							</div>
							{quoteLoading ? <div className="text-[11px] text-muted-foreground mt-1">Updating…</div> : null}
						</div>
						<div className="text-right">
							<div className="text-xs text-muted-foreground">Total</div>
							<div className="mt-1 text-lg font-bold text-oz-primary">{formatCurrency(Math.round(totalAnimated))}</div>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-3 gap-3">
					<div className="rounded-2xl border bg-oz-neutral/10 p-3">
						<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
							<Dumbbell className="h-3.5 w-3.5" /> Protein
						</div>
						<div className="mt-1 font-semibold text-oz-primary">{Math.round(proteinAnimated)}g</div>
					</div>
					<div className="rounded-2xl border bg-oz-neutral/10 p-3">
						<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
							<Flame className="h-3.5 w-3.5" /> Calories
						</div>
						<div className="mt-1 font-semibold text-oz-primary">{quote?.calories == null ? '—' : Math.round(caloriesAnimated)}</div>
					</div>
					<div className="rounded-2xl border bg-oz-neutral/10 p-3">
						<div className="text-[11px] text-muted-foreground">Ingredients</div>
						<div className="mt-1 font-semibold text-oz-primary">{selectedDetails.length}</div>
					</div>
				</div>

				<Separator />

				{/* Minimum progress */}
				{(mode === 'weekly' || mode === 'monthly') && quote ? (
					(() => {
						const remaining = getRemainingToMinimum(quote);
						const progress = quote.minimumRequired > 0 ? clamp(quote.total / quote.minimumRequired, 0, 1) : 0;
						const met = quote.meetsMinimum;
						return (
							<div className={met ? 'rounded-2xl border border-green-200 bg-green-50 p-4' : 'rounded-2xl border border-amber-200 bg-amber-50 p-4'}>
								<div className="flex items-start gap-3">
									<div className={met ? 'mt-0.5 rounded-full bg-green-100 p-1' : 'mt-0.5 rounded-full bg-amber-100 p-1'}>
										{met ? <Check className="h-4 w-4 text-green-700" /> : <AlertCircle className="h-4 w-4 text-amber-700" />}
									</div>
									<div className="min-w-0 flex-1">
										<div className={met ? 'text-sm font-semibold text-green-900' : 'text-sm font-semibold text-amber-900'}>
											{met ? 'Minimum unlocked' : `₹${Math.round(remaining)} more to unlock ${mode} subscription`}
										</div>
										<div className={met ? 'text-xs text-green-800/80 mt-0.5' : 'text-xs text-amber-800/80 mt-0.5'}>
											Minimum: {formatCurrency(quote.minimumRequired)} • Current: {formatCurrency(quote.total)}
										</div>
										<div className="mt-3 h-2 w-full rounded-full bg-white/70 border border-white/60 overflow-hidden">
											<div
												className={met ? 'h-full bg-green-500 transition-all duration-500' : 'h-full bg-amber-500 transition-all duration-500'}
												style={{ width: `${Math.round(progress * 100)}%` }}
											/>
										</div>
									</div>
								</div>
							</div>
						);
					})()
				) : null}

				<div className="space-y-2">
					<div className="text-sm font-semibold text-oz-primary">Purchase mode</div>
					<div className="grid grid-cols-3 gap-2">
						<Button
							variant={mode === 'single' ? 'default' : 'outline'}
							className={mode === 'single' ? 'bg-oz-accent hover:bg-oz-accent/90' : ''}
							onClick={() => setMode('single')}
						>
							Single
						</Button>
						<Button
							variant={mode === 'weekly' ? 'default' : 'outline'}
							className={mode === 'weekly' ? 'bg-oz-accent hover:bg-oz-accent/90 relative' : 'relative'}
							onClick={() => setMode('weekly')}
						>
							Weekly
						</Button>
						<Button
							variant={mode === 'monthly' ? 'default' : 'outline'}
							className={mode === 'monthly' ? 'bg-oz-accent hover:bg-oz-accent/90' : ''}
							onClick={() => setMode('monthly')}
						>
							Monthly
						</Button>
					</div>
				</div>

				<div className="rounded-2xl border bg-white p-3">
					<div className="flex items-center justify-between">
						<div className="text-sm font-semibold text-oz-primary">Selected ingredients</div>
						<div className="text-xs text-muted-foreground">{selectedDetails.length} items</div>
					</div>
					{selectedDetails.length === 0 ? (
						<div className="text-sm text-muted-foreground mt-2">No ingredients selected yet.</div>
					) : (
						<div className="mt-3 space-y-2">
							{selectedDetails.map((item) => (
								<div key={item.itemId} className="flex items-center justify-between gap-3 rounded-xl border bg-oz-neutral/5 p-2">
									<div className="min-w-0">
										<div className="text-sm font-medium text-oz-primary truncate">{item.name}</div>
										<div className="text-[11px] text-muted-foreground">
											{item.quantity}× · {formatCurrency(item.unitPrice)} each · {formatCurrency(item.lineTotal)}
										</div>
									</div>
									<div className="flex items-center gap-1">
										<Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(item.itemId, -1)} aria-label={`Decrease ${item.name}`}>
											<Minus className="h-4 w-4" />
										</Button>
										<Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(item.itemId, 1)} aria-label={`Increase ${item.name}`}>
											<Plus className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											onClick={() =>
												setSelections((prev) => {
													const { [item.itemId]: _, ...rest } = prev;
													return rest;
												})
											}
											title="Remove"
											aria-label={`Remove ${item.name}`}
										>
											<Trash2 className="h-4 w-4 text-muted-foreground" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="relative">
					<Button
						className={justAdded ? 'w-full bg-green-600 hover:bg-green-600/90 transition-all' : 'w-full bg-oz-secondary hover:bg-oz-secondary/90 transition-all'}
						disabled={
							!hasSelections ||
							quoteLoading ||
							!quote ||
							((mode === 'weekly' || mode === 'monthly') && !quote.meetsMinimum)
						}
						onClick={() => {
						if (!hasSelections) {
							toast({ title: 'Select ingredients', description: 'Choose at least one ingredient before adding to cart.', variant: 'destructive' });
							return;
						}
						if (!quote) {
							toast({ title: 'Please wait', description: 'Computing BYO totals…', variant: 'destructive' });
							return;
						}
						if ((mode === 'weekly' || mode === 'monthly') && !quote.meetsMinimum) {
							toast({
								title: 'Minimum not met',
								description: `Minimum ${mode} order is ${formatCurrency(quote.minimumRequired)}.`,
								variant: 'destructive',
							});
							return;
						}

						addItem({
							type: 'byo',
							plan: mode,
							selections: selectionList,
							quantity: 1,
							byoSnapshot: {
								plan: mode,
								total: quote.total,
								proteinGrams: quote.proteinGrams,
								calories: quote.calories,
								minimumRequired: quote.minimumRequired,
								meetsMinimum: quote.meetsMinimum,
								lineItems: quote.lineItems,
								ingredients: selectedDetails,
							},
						} as Parameters<typeof addItem>[0]);

							toast({ title: 'Added to cart', description: `Build Your Own (${mode}) added to cart.` });
							setJustAdded(true);
							window.setTimeout(() => setJustAdded(false), 1400);
					}}
				>
						{justAdded ? (
							<span className="inline-flex items-center gap-2">
								<Check className="h-4 w-4" /> Added
							</span>
						) : (
							<span className="inline-flex items-center gap-2">
								<ShoppingCart className="h-4 w-4" /> Add to Cart
							</span>
						)}
				</Button>
					{justAdded ? (
						<div className="absolute -top-12 left-0 right-0 mx-auto w-full">
							<div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 shadow-sm flex items-center justify-between gap-2">
								<span className="font-medium">Added to cart</span>
								<Link to="/cart" className="text-sm font-semibold text-oz-primary hover:underline">View cart</Link>
							</div>
						</div>
					) : null}
				</div>
			</CardContent>
		</Card>
	);

	return (
		<div className="animate-fade-in">
			<section className="relative overflow-hidden bg-gradient-to-br from-black via-oz-primary to-black text-white py-10 md:py-14">
				<div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),transparent_55%)]" />
				<div className="container mx-auto px-4 relative">
					<div className="max-w-3xl">
						<Link to="/" className="inline-flex items-center text-white/80 hover:text-white text-sm">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back
						</Link>
						<div className="flex items-center gap-3 mt-5">
							<div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
								<Sparkles className="h-6 w-6" />
							</div>
							<div>
								<h1 className="text-3xl md:text-4xl font-bold">Build Your Own Meal</h1>
								<p className="text-white/80 mt-1">Customize ingredients. Live protein & pricing. Add your build to cart to checkout.</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="py-8 md:py-10 bg-oz-neutral/30">
				<div className="container mx-auto px-4">
					{error ? (
						<div className="rounded-2xl border bg-white p-6">
							<div className="font-semibold text-oz-primary">Couldn’t load ingredients</div>
							<div className="text-sm text-muted-foreground mt-1">{error}</div>
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">
							<div className="space-y-5">
								{loading ? (
									<Card className="border-oz-neutral/40 bg-white">
										<CardHeader className="pb-3">
											<CardTitle className="text-oz-primary">Your Meal Tray</CardTitle>
											<div className="text-sm text-muted-foreground">Loading preview…</div>
										</CardHeader>
										<CardContent>
											<div className="h-24 rounded-2xl bg-oz-neutral/20 animate-pulse" />
										</CardContent>
									</Card>
								) : (
									<TrayPreview itemTypes={activeItemTypes} items={activeItems} selections={selections} />
								)}

								<Card>
									<CardHeader>
										<CardTitle className="text-oz-primary">Ingredients</CardTitle>
										<div className="text-sm text-muted-foreground">Pick quantities per serving. Summary updates instantly.</div>
									</CardHeader>
									<CardContent>
										{loading ? (
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												{Array.from({ length: 6 }).map((_, i) => (
													<div key={i} className="rounded-2xl border border-oz-neutral/50 bg-white overflow-hidden shadow-sm">
														<div className="aspect-[4/3] w-full bg-oz-neutral/20 animate-pulse" />
														<div className="p-4 space-y-3">
															<div className="h-4 w-2/3 bg-oz-neutral/20 rounded animate-pulse" />
															<div className="h-3 w-full bg-oz-neutral/10 rounded animate-pulse" />
															<div className="h-9 w-full bg-oz-neutral/20 rounded-xl animate-pulse" />
														</div>
													</div>
												))}
											</div>
										) : activeItemTypes.length === 0 ? (
											<div className="text-sm text-muted-foreground">No Build-your-own categories available yet.</div>
										) : (
											<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
												<TabsList className="flex w-full flex-wrap justify-start gap-2">
													{activeItemTypes.map((t) => (
															<TabsTrigger key={t.id} value={t.id}>
																{t.name}
															</TabsTrigger>
														))}
												</TabsList>

												{activeItemTypes.map((t) => (
													<TabsContent key={t.id} value={t.id} className="mt-4">
														{(byType.get(t.id) || []).length === 0 ? (
															<div className="text-sm text-muted-foreground">No items in this category yet.</div>
														) : (
															<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
																{(byType.get(t.id) || []).map((item) => {
																	const qty = selections[item.id] || 0;
																	const unitPrice = item.pricing?.[mode] ?? 0;
																	const disabled = item.isActive === false;
																	const highProtein = typeof item.proteinGrams === 'number' && item.proteinGrams >= 20;
																	return (
																		<Card
																			key={item.id}
																			className={
																				(
																					disabled
																						? 'opacity-60 border-oz-neutral/50'
																						: qty > 0
																							? 'border-oz-neutral/70 shadow-md'
																							: 'border-oz-neutral/50 shadow-sm'
																				) + ' transition-all duration-200 will-change-transform hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01]'
																			}
																		>
																				<CardContent className="relative p-0 overflow-hidden rounded-2xl group">
																				<div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-oz-primary/10 via-oz-secondary/10 to-oz-accent/10">
																					{item.image?.url ? (
																						<img
																							src={item.image.url}
																								alt={item.image.alt || item.name}
																								className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
																								loading="lazy"
																							/>
																					) : (
																						<div className="h-full w-full flex items-center justify-center">
																							<ImageIcon className="h-6 w-6 text-muted-foreground" />
																						</div>
																					)}
																					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
																					{highProtein ? (
																						<span className="absolute top-3 right-3 rounded-full bg-oz-secondary text-white px-3 py-1 text-xs font-semibold shadow">High Protein</span>
																					) : null}
																					{disabled ? (
																						<span className="absolute top-3 left-3 rounded-full bg-black/60 text-white px-3 py-1 text-xs font-semibold">Unavailable</span>
																					) : null}
																				</div>

																				<div className="p-4">
																					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
																						<div className="min-w-0">
																							<div className="font-semibold text-oz-primary truncate">{item.name}</div>
																							<div className="mt-1 flex flex-wrap items-center gap-2">
																								<span className="inline-flex items-center rounded-full border border-oz-neutral/60 bg-white px-2.5 py-1 text-[11px] font-medium text-oz-primary">
																								{formatQtyUnit(item.quantityValue, item.quantityUnit)}
																								</span>
																								{typeof item.proteinGrams === 'number' ? (
																									<span className="inline-flex items-center gap-1 rounded-full bg-oz-secondary/10 text-oz-primary px-2.5 py-1 text-[11px] font-medium">
																										<Dumbbell className="h-3.5 w-3.5 text-oz-secondary" /> +{item.proteinGrams}g
																									</span>
																								) : null}
																								{typeof item.calories === 'number' ? (
																									<span className="inline-flex items-center gap-1 rounded-full bg-oz-neutral/30 text-oz-primary px-2.5 py-1 text-[11px] font-medium">
																										<Flame className="h-3.5 w-3.5 text-oz-accent" /> {item.calories} kcal
																									</span>
																								) : null}
																							</div>
																							<div className="mt-2 text-xs text-muted-foreground">
																								{formatCurrency(unitPrice)} <span className="text-muted-foreground/70">({mode})</span>
																							</div>
																						</div>
																						<div className={qty > 0 ? 'transition-transform duration-200 w-full sm:w-auto' : 'transition-transform duration-200 w-full sm:w-auto'}>
																							<QuantityStepper
																									value={qty}
																									onChange={(next) => setSelections((prev) => ({ ...prev, [item.id]: next }))}
																									disabled={disabled}
																									label={item.name}
																								/>
																							<div className="mt-2 flex flex-wrap gap-1 justify-start sm:justify-end">
																									<Button
																									variant="ghost"
																									size="sm"
																									className="h-9 px-3"
																									onClick={() => setSelections((prev) => ({ ...prev, [item.id]: Math.max(prev[item.id] || 0, 1) }))}
																									disabled={disabled}
																								>
																									1×
																								</Button>
																									<Button
																									variant="ghost"
																									size="sm"
																									className="h-9 px-3"
																									onClick={() => setSelections((prev) => ({ ...prev, [item.id]: Math.max(prev[item.id] || 0, 2) }))}
																									disabled={disabled}
																								>
																									2×
																								</Button>
																									<Button
																									variant="ghost"
																									size="sm"
																									className="h-9 px-3"
																									onClick={() => setSelections((prev) => ({ ...prev, [item.id]: Math.max(prev[item.id] || 0, 3) }))}
																									disabled={disabled}
																								>
																									3×
																								</Button>
																								</div>
																						</div>
																					</div>

																					</div>
																			</CardContent>
																		</Card>
																);
															})}
															</div>
														)}
													</TabsContent>
												))}
											</Tabs>
										)}
									</CardContent>
								</Card>

								<div className="rounded-2xl border border-oz-neutral/50 bg-white p-5 shadow-sm">
									<div className="flex items-start gap-3">
										<div className="mt-0.5 h-9 w-9 rounded-xl bg-oz-secondary/10 flex items-center justify-center">
											<Sparkles className="h-5 w-5 text-oz-secondary" />
										</div>
										<div>
											<div className="font-semibold text-oz-primary">Minimum order rules</div>
											<div className="text-sm text-muted-foreground mt-1">
												Weekly minimum: {formatCurrency(config?.minimumWeeklyOrderAmount || 0)} · Monthly minimum: {formatCurrency(config?.minimumMonthlyOrderAmount || 0)}
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="hidden lg:block">
								<div className="sticky top-24 space-y-4">{Summary}</div>
							</div>
						</div>
					)}
				</div>
			</section>

			<div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
				<div className="container mx-auto px-4 flex items-center justify-between gap-3">
					<div className="min-w-0">
						<div className="text-xs text-muted-foreground">Build-your-own</div>
						<div className="font-semibold text-oz-primary truncate">
							{formatCurrency(quote?.total || 0)} · {quote?.proteinGrams || 0}g protein
						</div>
						{(mode === 'weekly' || mode === 'monthly') && quote ? (
							<div className={quote.meetsMinimum ? 'mt-1 text-xs text-green-700' : 'mt-1 text-xs text-amber-700'}>
								{quote.meetsMinimum ? 'Minimum met' : `${formatCurrency(getRemainingToMinimum(quote))} to minimum`}
							</div>
						) : null}
					</div>
					<Drawer>
						<DrawerTrigger asChild>
							<Button variant="outline" className="h-11">View summary</Button>
						</DrawerTrigger>
						<DrawerContent>
							<DrawerHeader>
								<div className="flex items-center justify-between gap-3">
									<DrawerTitle>Summary</DrawerTitle>
									<DrawerClose asChild>
										<Button variant="ghost" className="h-9 px-3">Back to ingredients</Button>
									</DrawerClose>
								</div>
							</DrawerHeader>
							<div className="p-4 max-h-[75vh] overflow-auto">{Summary}</div>
							<DrawerFooter>
								<DrawerClose asChild>
									<Button variant="outline" className="h-11">Back to ingredients</Button>
								</DrawerClose>
							</DrawerFooter>
						</DrawerContent>
					</Drawer>
				</div>
			</div>
		</div>
	);
}
