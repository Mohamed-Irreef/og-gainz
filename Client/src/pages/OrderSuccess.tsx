import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, HelpCircle, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { cartCheckoutService } from '@/services/cartCheckoutService';
import { ordersService } from '@/services/ordersService';
import type { PublicOrder } from '@/types/ordersPhase5b';
import { normalizeOrderFlags } from '@/types/ordersPhase5b';

declare global {
	interface Window {
		Razorpay?: new (opts: unknown) => { open: () => void };
	}
}

const loadRazorpayScript = () => {
	return new Promise<void>((resolve, reject) => {
		if (window.Razorpay) return resolve();
		const existing = document.querySelector('script[data-razorpay="true"]') as HTMLScriptElement | null;
		if (existing) {
			existing.addEventListener('load', () => resolve());
			existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')));
			return;
		}
		const script = document.createElement('script');
		script.src = 'https://checkout.razorpay.com/v1/checkout.js';
		script.async = true;
		script.dataset.razorpay = 'true';
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Failed to load Razorpay'));
		document.body.appendChild(script);
	});
};

const POLL_MS = 2500;
const TIMEOUT_MS = 60_000;
const RETRY_CTA_AFTER_MS = 30_000;

export default function OrderSuccess() {
	const { orderId } = useParams();
	const navigate = useNavigate();
	const { clearCart } = useCart();
	const { toast } = useToast();

	const [order, setOrder] = useState<PublicOrder | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [timedOut, setTimedOut] = useState(false);
	const [isRetrying, setIsRetrying] = useState(false);
	const startedAtRef = useRef<number>(Date.now());
	const cartClearedRef = useRef(false);

	const flags = useMemo(() => {
		return normalizeOrderFlags({ status: order?.status, paymentStatus: order?.paymentStatus });
	}, [order?.paymentStatus, order?.status]);

	useEffect(() => {
		startedAtRef.current = Date.now();
		setTimedOut(false);
		setError(null);
		setOrder(null);
		cartClearedRef.current = false;
	}, [orderId]);

	useEffect(() => {
		if (!orderId) {
			setError('Missing order id');
			return;
		}

		let isMounted = true;
		let timer: number | undefined;

		const tick = async () => {
			try {
				const next = await ordersService.getMyOrderById(orderId, { noCache: true });
				if (!isMounted) return;
				setOrder(next);
				setError(null);

				const nextFlags = normalizeOrderFlags({ status: next.status, paymentStatus: next.paymentStatus });
				if (nextFlags.isFailed) {
					navigate(`/order/failed/${next.id}`, { replace: true });
					return;
				}

				if (nextFlags.isPaid) {
					if (!cartClearedRef.current) {
						cartClearedRef.current = true;
						clearCart();
					}
					return;
				}

				if (Date.now() - startedAtRef.current >= TIMEOUT_MS) {
					setTimedOut(true);
					return;
				}

				timer = window.setTimeout(() => void tick(), POLL_MS);
			} catch (e) {
				if (!isMounted) return;
				setError(e instanceof Error ? e.message : 'Failed to fetch order status');

				if (Date.now() - startedAtRef.current < TIMEOUT_MS) {
					timer = window.setTimeout(() => void tick(), POLL_MS);
				}
			}
		};

		void tick();
		return () => {
			isMounted = false;
			if (timer) window.clearTimeout(timer);
		};
	}, [clearCart, navigate, orderId]);

	const badge = useMemo(() => {
		if (flags.isPaid) return { variant: 'default' as const, label: 'Paid' };
		if (flags.isPending) return { variant: 'secondary' as const, label: 'Verifying' };
		return { variant: 'destructive' as const, label: 'Failed' };
	}, [flags.isPaid, flags.isPending]);

	const elapsedMs = Date.now() - startedAtRef.current;
	const showRetryCta = flags.isPending && elapsedMs >= RETRY_CTA_AFTER_MS;

	const handleRetry = async () => {
		if (!orderId) return;
		if (isRetrying) return;
		setIsRetrying(true);
		try {
			const retry = await cartCheckoutService.retryPayment(orderId);
			await loadRazorpayScript();
			if (!window.Razorpay) throw new Error('Razorpay failed to load');

			const opts = {
				key: retry.keyId,
				amount: retry.razorpayOrder.amount,
				currency: retry.razorpayOrder.currency,
				name: 'OG Gainz',
				description: `Retry payment for order ${retry.orderId}`,
				order_id: retry.razorpayOrder.id,
				notes: { appOrderId: retry.orderId },
				theme: { color: '#16A34A' },
				handler: () => {
					toast({ title: 'Payment submitted', description: 'Verifying payment status…' });
					navigate(`/order/success/${retry.orderId}`);
				},
				modal: {
					ondismiss: () => {
						toast({ title: 'Payment cancelled', description: 'No charges were confirmed. You can retry anytime.' });
					},
				},
			};

			const rz = new window.Razorpay(opts);
			rz.open();
		} catch (e) {
			toast({
				title: 'Retry failed',
				description: e instanceof Error ? e.message : 'Please try again',
				variant: 'destructive',
			});
		} finally {
			setIsRetrying(false);
		}
	};

	return (
		<div className="container mx-auto px-4 py-10 animate-fade-in">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						{flags.isPaid ? (
							<CheckCircle2 className="h-5 w-5 text-oz-secondary" />
						) : (
							<Clock className="h-5 w-5 text-muted-foreground" />
						)}
						<span>{flags.isPaid ? 'Payment Confirmed' : 'Verifying Payment'}</span>
						<Badge variant={badge.variant} className="text-xs">
							{badge.label}
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{order ? (
						<div className="text-sm text-muted-foreground">Order #{order.id.slice(-8)}</div>
					) : (
						<div className="space-y-2">
							<Skeleton className="h-4 w-40" />
						</div>
					)}

					{flags.isPaid ? (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								Your payment is verified by the server. You can now view your order.
							</p>
							<div className="flex flex-col sm:flex-row gap-2">
								<Button asChild>
									<Link to={order ? `/my-orders/${order.id}` : '/my-orders'}>View Order</Link>
								</Button>
								<Button asChild variant="outline">
									<Link to="/">Continue Shopping</Link>
								</Button>
							</div>
						</div>
					) : timedOut ? (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								This is taking longer than expected. Your payment may still be processing.
							</p>
							<div className="flex flex-col sm:flex-row gap-2">
								<Button asChild variant="outline">
									<Link to={order ? `/my-orders/${order.id}` : '/my-orders'}>Check Order Status</Link>
								</Button>
								<Button onClick={() => void handleRetry()} disabled={isRetrying}>
									{isRetrying ? 'Preparing…' : 'Retry Payment'}
								</Button>
								<Button asChild variant="outline">
									<Link to="/dashboard/support">
										<HelpCircle className="h-4 w-4 mr-2" />
										Contact Support
									</Link>
								</Button>
							</div>
						</div>
					) : (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								We’re waiting for Razorpay webhook confirmation. Please keep this page open.
							</p>
							{error ? <div className="text-sm text-destructive">{error}</div> : null}
							<div className="flex flex-col sm:flex-row gap-2">
								<Button
									variant="outline"
									onClick={() => window.location.reload()}
									className="w-fit"
								>
									<RefreshCw className="h-4 w-4 mr-2" />
									Refresh
								</Button>
								{showRetryCta ? (
									<Button onClick={() => void handleRetry()} disabled={isRetrying}>
										{isRetrying ? 'Preparing…' : 'Retry Payment'}
									</Button>
								) : null}
								{showRetryCta ? (
									<Button asChild variant="outline">
										<Link to="/dashboard/support">
											<HelpCircle className="h-4 w-4 mr-2" />
											Contact Support
										</Link>
									</Button>
								) : null}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
