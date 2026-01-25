import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, HelpCircle, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function OrderFailed() {
	const { orderId } = useParams();
	const navigate = useNavigate();
	const { toast } = useToast();
	const [order, setOrder] = useState<PublicOrder | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isRetrying, setIsRetrying] = useState(false);

	useEffect(() => {
		const run = async () => {
			setIsLoading(true);
			setError(null);
			try {
				if (!orderId) throw new Error('Missing order id');
				const res = await ordersService.getMyOrderById(orderId, { noCache: true });
				setOrder(res);
			} catch (e) {
				setError(e instanceof Error ? e.message : 'Failed to load order');
				setOrder(null);
			} finally {
				setIsLoading(false);
			}
		};
		void run();
	}, [orderId]);

	const flags = normalizeOrderFlags({ status: order?.status, paymentStatus: order?.paymentStatus });

	const reason = useMemo(() => {
		return order?.paymentFailureReason || (flags.isFailed ? 'Payment was not completed. You can safely retry.' : undefined);
	}, [flags.isFailed, order?.paymentFailureReason]);

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
						<AlertCircle className="h-5 w-5 text-amber-600" />
						<span>{flags.isPaid ? 'Payment Confirmed' : 'Payment Not Completed'}</span>
						<Badge variant={flags.isPaid ? 'default' : flags.isFailed ? 'secondary' : 'secondary'} className="text-xs">
							{flags.isPaid ? 'Paid' : flags.isFailed ? 'Failed' : 'Pending'}
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoading ? (
						<div className="space-y-2">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="h-4 w-64" />
						</div>
					) : null}
					{error ? <div className="text-sm text-destructive">{error}</div> : null}

					{!flags.isPaid ? (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								{reason || 'Your order is saved. You can safely retry payment without losing your cart.'}
							</p>
							<div className="flex flex-col sm:flex-row gap-2">
								<Button onClick={() => void handleRetry()} disabled={isRetrying || isLoading || Boolean(error)}>
									{isRetrying ? 'Preparing…' : 'Retry Payment'}
								</Button>
								<Button asChild variant="outline">
									<Link to={orderId ? `/my-orders/${orderId}` : '/my-orders'}>Go to My Orders</Link>
								</Button>
								<Button asChild variant="outline">
									<Link to="/dashboard/support">
										<HelpCircle className="h-4 w-4 mr-2" />
										Contact Support
									</Link>
								</Button>
							</div>
							<Button variant="ghost" onClick={() => window.location.reload()} className="w-fit">
								<RefreshCw className="h-4 w-4 mr-2" />
								Refresh Status
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">This order is already paid.</p>
							<Button asChild>
								<Link to={orderId ? `/my-orders/${orderId}` : '/my-orders'}>View Order</Link>
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
