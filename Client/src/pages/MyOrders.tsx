import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, RefreshCw, ArrowRight, RotateCcw } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatCurrency';
import { ordersService } from '@/services/ordersService';
import type { PublicOrder } from '@/types/ordersPhase5b';
import { normalizeOrderFlags } from '@/types/ordersPhase5b';

const formatDateTime = (dateString: string) => {
	return new Date(dateString).toLocaleDateString('en-IN', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

const statusBadge = (order: Pick<PublicOrder, 'status' | 'paymentStatus'>) => {
	const { isPaid, isFailed } = normalizeOrderFlags(order);
	if (isPaid) return { variant: 'default' as const, label: 'Paid' };
	if (isFailed) return { variant: 'destructive' as const, label: 'Failed' };
	return { variant: 'secondary' as const, label: 'Pending' };
};

export default function MyOrders() {
	const [orders, setOrders] = useState<PublicOrder[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const ac = new AbortController();
			const res = await ordersService.listMyOrders({ page: 1, limit: 30, signal: ac.signal });
			setOrders(res.items);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to load orders');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, []);

	const content = useMemo(() => {
		if (isLoading) {
			return (
				<Card>
					<CardContent className="py-12 text-center">
						<div className="text-sm text-muted-foreground">Loading orders…</div>
					</CardContent>
				</Card>
			);
		}

		if (error) {
			return (
				<Card>
					<CardContent className="py-12 text-center space-y-3">
						<div className="text-sm text-destructive">{error}</div>
						<Button variant="outline" onClick={() => void load()}>
							<RefreshCw className="h-4 w-4 mr-2" />
							Retry
						</Button>
					</CardContent>
				</Card>
			);
		}

		if (!orders.length) {
			return (
				<Card>
					<CardContent className="py-12 text-center">
						<Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
						<h3 className="font-semibold text-lg mb-2">No Orders Yet</h3>
						<p className="text-muted-foreground">Your orders will show up here after checkout.</p>
					</CardContent>
				</Card>
			);
		}

		return (
			<div className="space-y-4">
				{orders.map((order) => {
					const badge = statusBadge(order);
					const flags = normalizeOrderFlags(order);
					return (
						<Card key={order.id}>
							<CardContent className="pt-6">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-semibold">Order #{order.id.slice(-8)}</span>
											<Badge variant={badge.variant} className="text-xs">
												{badge.label}
											</Badge>
										</div>
										<p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
										{order.deliveryAddressSummary ? (
											<p className="text-xs text-muted-foreground">{order.deliveryAddressSummary}</p>
										) : null}
									</div>

									<div className="flex items-center gap-4">
										<div className="text-right">
											<p className="text-xs text-muted-foreground">Total</p>
											<p className="font-semibold text-oz-primary">{formatCurrency(order.total)}</p>
										</div>

										{flags.isFailed ? (
											<Button asChild size="sm">
												<Link to={`/order/failed/${order.id}`}>
													<RotateCcw className="h-4 w-4 mr-2" />
													Retry Payment
												</Link>
											</Button>
										) : null}

										<Button asChild variant="outline" size="sm">
											<Link to={`/my-orders/${order.id}`}>
												View
												<ArrowRight className="h-4 w-4 ml-2" />
											</Link>
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		);
	}, [error, isLoading, orders]);

	return (
		<div className="container mx-auto px-4 py-8 animate-fade-in">
			<div className="flex items-center justify-between gap-3 mb-6">
				<div>
					<h1 className="text-2xl font-bold text-oz-primary">My Orders</h1>
					<p className="text-sm text-muted-foreground">Order status is verified by the server.</p>
				</div>
				<Button variant="outline" onClick={() => void load()} disabled={isLoading}>
					<RefreshCw className="h-4 w-4 mr-2" />
					Refresh
				</Button>
			</div>

			{content}
		</div>
	);
}
