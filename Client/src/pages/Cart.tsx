import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, ArrowLeft, ArrowRight, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { formatCurrency } from "@/utils/formatCurrency";
import { useSafeBack } from '@/hooks/use-safe-back';

const Cart = () => {
	const navigate = useNavigate();
	const { toast } = useToast();
	const handleBack = useSafeBack('/meal-packs');
	const { state, quote, isQuoting, quoteError, removeItem, updateQuantity, setCreditsToApply, setDeliveryLocation, clearCart } = useCart();
	const { user, isAuthenticated } = useUser();

	const walletBalance = user?.walletBalance || 0;

	const [creditsToApplyLocal, setCreditsToApplyLocal] = useState(0);
	const [addressText] = useState(state.deliveryLocation?.address ?? '');

	const quoteByCartItemId = useMemo(() => {
		const map = new Map<string, (typeof quote.items)[number]>();
		for (const qi of quote?.items || []) map.set(qi.cartItemId, qi);
		return map;
	}, [quote]);

	const handleApplyCredits = () => {
		const amount = Math.max(0, Math.floor(Number(creditsToApplyLocal) || 0));
		setCreditsToApply(amount);
		toast({
			title: "Credits Updated",
			description: "Cart totals are recalculated by the server.",
		});
	};

	const handleGetCurrentLocation = () => {
		if (!('geolocation' in navigator)) {
			toast({
				title: 'Geolocation unavailable',
				description: 'Your browser does not support geolocation.',
				variant: 'destructive',
			});
			return;
		}

		toast({ title: 'Fetching location…', description: 'Please allow location access in your browser.' });
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setDeliveryLocation({
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
					address: addressText || undefined,
				});
				toast({
					title: 'Location set',
					description: 'Delivery distance & fee are calculated by the server.',
				});
			},
			(err) => {
				toast({
					title: 'Failed to get location',
					description: (err as { message?: string } | undefined)?.message || 'Please try again.',
					variant: 'destructive',
				});
			},
			{ enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
		);
	};

	const handleCheckout = () => {
		if (!isAuthenticated) {
			toast({
				title: "Login Required",
				description: "Please login to proceed with checkout.",
				variant: "destructive",
			});
			navigate("/login");
			return;
		}
		navigate("/order-details");
	};

	const isTrialRepeatError = (quoteError || '').toLowerCase().includes('trial already used');
	const hasLocation = Boolean(state.deliveryLocation?.latitude != null && state.deliveryLocation?.longitude != null);
	const ordersPaused = true;
	const totalServings = useMemo(() => {
		return state.items.reduce((sum, item) => {
			const metaServings = (item as { meta?: { subscriptionServings?: number } }).meta?.subscriptionServings;
			if (typeof metaServings === 'number' && metaServings > 0) return sum + metaServings;
			if (item.plan === 'weekly') return sum + 5;
			if (item.plan === 'monthly') return sum + 20;
			return sum + Math.max(1, item.quantity || 1);
		}, 0);
	}, [state.items]);
	const baseDeliveryFee = quote?.deliveryFee ?? 0;
	const computedDeliveryFee = hasLocation && quote ? baseDeliveryFee * totalServings : 0;
	const computedTotal = quote ? quote.subtotal + computedDeliveryFee - (quote.creditsApplied || 0) : 0;

	if (state.items.length === 0) {
		return (
			<div className="container mx-auto px-4 py-16 text-center animate-fade-in">
				<div className="max-w-md mx-auto">
					<div className="w-24 h-24 rounded-full bg-oz-neutral/50 flex items-center justify-center mx-auto mb-6">
						<ShoppingCart className="h-12 w-12 text-muted-foreground" />
					</div>
					<h1 className="text-2xl font-bold text-oz-primary mb-4">Your Cart is Empty</h1>
					<p className="text-muted-foreground mb-8">
						Looks like you haven't added anything yet. Explore our options and start your fitness journey!
					</p>
					<Link to="/meal-packs">
						<Button className="bg-oz-accent hover:bg-oz-accent/90">
							Browse Meal Packs
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="animate-fade-in">
			<div className="bg-oz-neutral/30 border-b border-oz-neutral">
				<div className="container mx-auto px-4 py-4">
					<button
						type="button"
						onClick={handleBack}
						className="inline-flex items-center text-sm text-muted-foreground hover:text-oz-primary transition-colors"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Continue Shopping
					</button>
				</div>
			</div>

			<div className="container mx-auto px-4 py-6 md:py-8">
				<h1 className="text-3xl font-bold text-oz-primary mb-6">Your Cart</h1>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-4">
						{state.items.map((item) => {
							const q = quoteByCartItemId.get(item.id);
							const isSubscription = item.plan === 'weekly' || item.plan === 'monthly';
							const subscriptionServings =
								item && typeof (item as { meta?: { subscriptionServings?: unknown } }).meta?.subscriptionServings === 'number'
									? (item as { meta?: { subscriptionServings?: number } }).meta?.subscriptionServings
									: undefined;
							return (
								<Card key={item.id} className="overflow-hidden">
									<CardContent className="p-4 md:p-6">
										<div className="flex flex-col md:flex-row md:items-center gap-4">
											<div className="flex-1">
												<h3 className="font-semibold text-oz-primary text-lg">{q?.title || 'Cart item'}</h3>
												<p className="text-sm text-muted-foreground capitalize">{item.type} • {item.plan}</p>
												{isSubscription && subscriptionServings != null ? (
													<p className="mt-1 text-xs text-muted-foreground">Servings: {subscriptionServings}</p>
												) : null}
											</div>

											<div className="flex items-center gap-4">
												{isSubscription ? (
													<div className="text-xs text-muted-foreground">Qty: 1</div>
												) : (
													<QuantityStepper value={item.quantity} min={1} max={10} onChange={(qty) => updateQuantity(item.id, qty)} />
												)}
											</div>

											<div className="flex items-center justify-between md:justify-end gap-4 md:min-w-[140px]">
												<div className="text-right">
													<div className="text-xs text-muted-foreground">Line total</div>
													<div className="text-lg font-semibold text-oz-primary">{q ? formatCurrency(q.lineTotal) : '—'}</div>
												</div>
												<Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
													<Trash2 className="h-5 w-5" />
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}

						<div className="flex justify-end">
							<Button variant="ghost" onClick={clearCart} className="text-muted-foreground hover:text-destructive">
								<Trash2 className="mr-2 h-4 w-4" />
								Clear Cart
							</Button>
						</div>
					</div>

					<div className="lg:col-span-1">
						<div className="sticky top-24 space-y-6">

							{isAuthenticated && walletBalance > 0 && (
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-base flex items-center gap-2">
											<Wallet className="h-4 w-4 text-oz-accent" />
											Wallet Credits
										</CardTitle>
									</CardHeader>
									<CardContent className="p-4 md:p-6">
										<p className="text-sm text-muted-foreground mb-3">
											Available: <span className="font-semibold text-oz-primary">{formatCurrency(walletBalance)}</span>
										</p>
										<div className="flex gap-2">
											<Input type="number" min={0} max={walletBalance} value={creditsToApplyLocal} onChange={(e) => setCreditsToApplyLocal(parseFloat(e.target.value) || 0)} placeholder="Amount" className="flex-1" />
											<Button onClick={handleApplyCredits} variant="outline" className="border-oz-accent text-oz-accent hover:bg-oz-accent/5" disabled={creditsToApplyLocal <= 0}>
												Apply
											</Button>
										</div>
									</CardContent>
								</Card>
							)}

							<Card className="border-oz-secondary">
								<CardHeader className="bg-oz-secondary/5">
									<CardTitle className="text-oz-primary">Order Summary</CardTitle>
								</CardHeader>
								<CardContent className="p-4 md:p-6">
									<div className="mb-4 rounded-lg border border-oz-neutral/40 bg-oz-neutral/10 p-3">
										<div className="flex flex-col gap-2">
											<div className="flex items-center gap-2 text-sm font-medium text-oz-primary">
												<MapPin className="h-4 w-4 text-oz-secondary" />
												Get Current Location
											</div>
											<p className="text-xs text-muted-foreground">
												Location is required to calculate delivery fees.
											</p>
											<Button variant="outline" onClick={handleGetCurrentLocation} className="w-full">
												Get Current Location
											</Button>
											{hasLocation && quote?.distanceKm != null ? (
												<div className="text-xs text-muted-foreground">
													Detected: {state.deliveryLocation?.latitude?.toFixed(5)}, {state.deliveryLocation?.longitude?.toFixed(5)}
												</div>
											) : null}
											<div className="text-xs text-muted-foreground">
												{quote?.distanceKm != null ? `Distance: ${quote.distanceKm} km` : 'Distance: —'}
											</div>
										</div>
									</div>
									{quoteError && (
										<div className={isTrialRepeatError ? "mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3" : "mb-3 text-sm text-destructive"}>
											{isTrialRepeatError ? (
												<div className="space-y-2">
													<div className="text-sm font-semibold text-amber-900">Trial already used</div>
													<div className="text-sm text-amber-800">You’ve already used a trial for this meal. Please choose a Weekly or Monthly subscription.</div>
													<Button
														variant="outline"
														onClick={() => navigate('/meal-packs')}
														className="border-amber-300 text-amber-900 hover:bg-amber-100"
													>
														Move to Subscription
													</Button>
												</div>
											) : (
												<div className="text-sm text-destructive">{quoteError}</div>
											)}
										</div>
									)}
									<div className="space-y-3">
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">Subtotal</span>
											<span>{quote ? formatCurrency(quote.subtotal) : '—'}</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">Distance</span>
											<span>{quote?.distanceKm != null ? `${quote.distanceKm} km from OG Gainz Kitchen` : '—'}</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">Delivery Fee</span>
											<span>
												{quote && hasLocation
													? computedDeliveryFee === 0
														? <span className="text-green-600">Free</span>
														: formatCurrency(computedDeliveryFee)
													: '—'}
											</span>
										</div>
										{quote && quote.creditsApplied > 0 && (
											<div className="flex justify-between text-sm text-green-600">
												<span>Wallet Credits</span>
												<span>-{formatCurrency(quote.creditsApplied)}</span>
											</div>
										)}
										<Separator />
										<div className="flex justify-between font-semibold text-lg">
											<span className="text-oz-primary">Total</span>
											<span className="text-oz-accent">{quote ? formatCurrency(computedTotal) : '—'}</span>
										</div>
									</div>

									{ordersPaused && (
										<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
											Orders will be taken from 18 Feb 2026.
										</div>
									)}

									<Button
										onClick={handleCheckout}
										className="w-full mt-6 bg-oz-accent hover:bg-oz-accent/90 h-12 text-lg"
										disabled={ordersPaused || isQuoting || !hasLocation || (quote ? !quote.isServiceable : false)}
									>
										Proceed to Order Details
										<ArrowRight className="ml-2 h-5 w-5" />
									</Button>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Cart;
