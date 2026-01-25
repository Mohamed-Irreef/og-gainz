// OG Gainz - Subscription Detail Page (delivery-backed)
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ChevronLeft, Pause } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { useToast } from '@/hooks/use-toast';
import { deliveriesService, type MyDelivery } from '@/services/deliveriesService';
import { pauseSkipService } from '@/services/pauseSkipService';
import type { PauseSkipRequest } from '@/types';

const safeString = (v: unknown) => String(v ?? '').trim();

const toLocalISO = (d: Date) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
};

const toDeliveryBadge = (status: MyDelivery['status']) => {
	switch (status) {
		case 'PENDING':
			return { label: 'Pending', cls: 'bg-slate-100 text-slate-900 border-slate-200' };
		case 'COOKING':
			return { label: 'Cooking', cls: 'bg-orange-100 text-orange-900 border-orange-200' };
		case 'PACKED':
			return { label: 'Packed', cls: 'bg-blue-100 text-blue-900 border-blue-200' };
		case 'OUT_FOR_DELIVERY':
			return { label: 'Out for delivery', cls: 'bg-purple-100 text-purple-900 border-purple-200' };
		case 'DELIVERED':
			return { label: 'Delivered', cls: 'bg-green-100 text-green-900 border-green-200' };
		case 'SKIPPED':
			return { label: 'Skipped', cls: 'bg-red-100 text-red-900 border-red-200' };
		default:
			return { label: String(status), cls: 'bg-muted text-muted-foreground border' };
	}
};

export default function SubscriptionDetailPage() {
	const { toast } = useToast();
	const { id } = useParams<{ id: string }>();
	const subscriptionId = safeString(id);

	const [loading, setLoading] = useState(true);
	const [deliveries, setDeliveries] = useState<MyDelivery[]>([]);
	const [requests, setRequests] = useState<PauseSkipRequest[]>([]);

	const [pauseRequestOpen, setPauseRequestOpen] = useState(false);
	const [pauseStart, setPauseStart] = useState('');
	const [pauseEnd, setPauseEnd] = useState('');
	const [pauseReason, setPauseReason] = useState('');
	const [pauseSaving, setPauseSaving] = useState(false);
	const [skipSavingId, setSkipSavingId] = useState<string | null>(null);

	useEffect(() => {
		if (!subscriptionId) return;
		const controller = new AbortController();
		setLoading(true);
		const from = toLocalISO(new Date());
		const to = (() => {
			const d = new Date();
			d.setDate(d.getDate() + 13);
			return toLocalISO(d);
		})();

		Promise.all([
			deliveriesService.listMy({ from, to, signal: controller.signal }),
			pauseSkipService.listMyRequests({ signal: controller.signal }),
		])
			.then(([d, r]) => {
				setDeliveries(d || []);
				setRequests(r || []);
			})
			.catch((e: unknown) => {
				toast({
					title: 'Failed to load subscription',
					description: String((e as { message?: unknown })?.message || e),
					variant: 'destructive',
				});
			})
			.finally(() => setLoading(false));

		return () => controller.abort();
	}, [subscriptionId, toast]);

	const subscriptionDeliveries = useMemo(() => {
		return deliveries
			.filter((d) => safeString(d.subscriptionId) === subscriptionId)
			.slice()
			.sort((a, b) => `${safeString(a.date)} ${safeString(a.time)}`.localeCompare(`${safeString(b.date)} ${safeString(b.time)}`));
	}, [deliveries, subscriptionId]);

	const title = useMemo(() => {
		const first = subscriptionDeliveries[0];
		return safeString(first?.items?.[0]?.title) || 'Meal Pack';
	}, [subscriptionDeliveries]);

	const plan = useMemo(() => {
		const first = subscriptionDeliveries[0];
		return safeString(first?.items?.[0]?.plan).toLowerCase() || 'weekly';
	}, [subscriptionDeliveries]);

	const orderId = useMemo(() => {
		const first = subscriptionDeliveries[0];
		return safeString(first?.items?.[0]?.orderId) || '';
	}, [subscriptionDeliveries]);

	const pendingPause = useMemo(() => {
		return requests.some(
			(r) => r.requestType === 'PAUSE' && r.status === 'PENDING' && safeString(r.subscriptionId) === subscriptionId
		);
	}, [requests, subscriptionId]);

	const approvedPauseUntil = useMemo(() => {
		let best = '';
		for (const r of requests) {
			if (r.requestType !== 'PAUSE') continue;
			if (r.status !== 'APPROVED') continue;
			if (safeString(r.subscriptionId) !== subscriptionId) continue;
			const end = safeString(r.pauseEndDate);
			if (end && end > best) best = end;
		}
		return best;
	}, [requests, subscriptionId]);

	const pendingSkipByDeliveryId = useMemo(() => {
		const set = new Set<string>();
		for (const r of requests) {
			if (r.requestType !== 'SKIP') continue;
			if (r.status !== 'PENDING') continue;
			const did = safeString(r.deliveryId);
			if (did) set.add(did);
		}
		return set;
	}, [requests]);

	const today = toLocalISO(new Date());
	const todayDelivery = subscriptionDeliveries.find((d) => safeString(d.date) === today);
	const todayDeliveryId = safeString(todayDelivery?._id || todayDelivery?.id);
	const canRequestSkipToday = Boolean(
		todayDeliveryId && todayDelivery?.status === 'PENDING' && !pendingSkipByDeliveryId.has(todayDeliveryId)
	);

	const openPause = () => {
		const t = (() => {
			const d = new Date();
			d.setDate(d.getDate() + 1);
			return toLocalISO(d);
		})();
		setPauseStart(t);
		setPauseEnd(t);
		setPauseReason('');
		setPauseRequestOpen(true);
	};

	const submitPause = async () => {
		setPauseSaving(true);
		try {
			await pauseSkipService.requestPause({
				kind: 'mealPack',
				subscriptionId,
				pauseStartDate: pauseStart,
				pauseEndDate: pauseEnd,
				reason: pauseReason || undefined,
			});
			const next = await pauseSkipService.listMyRequests({});
			setRequests(next);
			toast({ title: 'Pause Requested', description: 'An admin will review your request shortly.' });
			setPauseRequestOpen(false);
		} catch (e: unknown) {
			toast({
				title: 'Failed to request pause',
				description: String((e as { message?: unknown })?.message || e),
				variant: 'destructive',
			});
		} finally {
			setPauseSaving(false);
		}
	};

	const requestSkip = async () => {
		if (!todayDeliveryId) return;
		setSkipSavingId(todayDeliveryId);
		try {
			await pauseSkipService.requestSkipDelivery({ deliveryId: todayDeliveryId });
			const next = await pauseSkipService.listMyRequests({});
			setRequests(next);
			toast({ title: 'Skip Requested', description: 'An admin will review your request shortly.' });
		} catch (e: unknown) {
			toast({
				title: 'Failed to request skip',
				description: String((e as { message?: unknown })?.message || e),
				variant: 'destructive',
			});
		} finally {
			setSkipSavingId(null);
		}
	};

	if (!subscriptionId) {
		return (
			<div className="space-y-4">
				<div className="text-sm text-muted-foreground">Missing subscription id.</div>
				<Link to="/dashboard/subscriptions">
					<Button variant="outline">Back to Subscriptions</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Dialog open={pauseRequestOpen} onOpenChange={setPauseRequestOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request a Pause</DialogTitle>
						<DialogDescription>Pick a date range. Your request will be reviewed by an admin.</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="space-y-1">
								<div className="text-sm font-medium">Start date</div>
								<Input type="date" value={pauseStart} onChange={(e) => setPauseStart(e.target.value)} />
							</div>
							<div className="space-y-1">
								<div className="text-sm font-medium">End date</div>
								<Input type="date" value={pauseEnd} onChange={(e) => setPauseEnd(e.target.value)} />
							</div>
						</div>
						<div className="space-y-1">
							<div className="text-sm font-medium">Reason (optional)</div>
							<Textarea value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} placeholder="Tell us why you need a pause…" />
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setPauseRequestOpen(false)} disabled={pauseSaving}>
								Cancel
							</Button>
							<Button onClick={submitPause} disabled={pauseSaving || !pauseStart || !pauseEnd}>
								Submit Request
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<div className="flex items-center justify-between gap-3">
				<Link
					to="/dashboard/subscriptions"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<ChevronLeft className="h-4 w-4" />
					Back to Subscriptions
				</Link>
				<Link to="/dashboard/deliveries">
					<Button variant="outline" size="sm">Open Deliveries</Button>
				</Link>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex flex-col gap-1">
						<span className="text-xl">{title}</span>
						<span className="text-sm text-muted-foreground capitalize">{plan} plan</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{orderId ? <div className="text-sm text-muted-foreground">Order: {orderId.slice(0, 12)}…</div> : null}
					<div className="text-sm text-muted-foreground">Subscription ID: {subscriptionId.slice(0, 12)}…</div>

					<div className="flex flex-wrap items-center gap-2">
						{pendingPause ? (
							<Badge variant="outline" className="bg-yellow-100 text-yellow-900 border-yellow-200">Pause Requested</Badge>
						) : approvedPauseUntil ? (
							<Badge variant="outline" className="bg-yellow-50 text-yellow-900 border-yellow-200">Paused until {approvedPauseUntil}</Badge>
						) : (
							<Badge variant="outline" className="bg-white">Active</Badge>
						)}

						<Button variant="outline" size="sm" onClick={openPause} disabled={pendingPause}>
							<Pause className="mr-2 h-4 w-4" />
							{pendingPause ? 'Pause Requested' : 'Request Pause'}
						</Button>

						<Button
							variant="outline"
							size="sm"
							onClick={requestSkip}
							disabled={!canRequestSkipToday || skipSavingId === todayDeliveryId}
						>
							{todayDeliveryId && pendingSkipByDeliveryId.has(todayDeliveryId) ? 'Skip Requested' : 'Request Skip (Today)'}
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Upcoming deliveries</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="text-sm text-muted-foreground">Loading…</div>
					) : subscriptionDeliveries.length === 0 ? (
						<div className="text-sm text-muted-foreground">No deliveries found for this subscription in the next 14 days.</div>
					) : (
						<div className="space-y-2">
							{subscriptionDeliveries.map((d) => {
								const deliveryId = safeString(d._id || d.id);
								const badge = toDeliveryBadge(d.status);
								return (
									<div key={deliveryId} className="rounded-md border p-3">
										<div className="flex items-center justify-between gap-2">
											<div className="font-medium">{safeString(d.date)} · {safeString(d.time)}</div>
											<Badge variant="outline" className={badge.cls}>{badge.label}</Badge>
										</div>
										<div className="mt-2 space-y-1 text-sm">
											{(d.items || []).map((it) => (
												<div key={safeString(it.cartItemId)} className="flex items-center justify-between gap-2">
													<div className="truncate">{safeString(it.title) || 'Item'}</div>
													<div className="text-muted-foreground">Qty {it.quantity}</div>
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Pause / Skip requests</CardTitle>
				</CardHeader>
				<CardContent>
					{requests.filter(
						(r) =>
							safeString(r.subscriptionId) === subscriptionId ||
							subscriptionDeliveries.some((d) => safeString(d._id || d.id) === safeString(r.deliveryId))
					).length === 0 ? (
						<div className="text-sm text-muted-foreground">No requests found for this subscription.</div>
					) : (
						<div className="space-y-2">
							{requests
								.filter(
									(r) =>
										safeString(r.subscriptionId) === subscriptionId ||
										subscriptionDeliveries.some((d) => safeString(d._id || d.id) === safeString(r.deliveryId))
								)
								.slice(0, 20)
								.map((r) => (
									<div key={r.id} className="rounded-md border p-3">
										<div className="flex items-center justify-between gap-2">
											<div className="font-medium">{r.requestType}</div>
											<Badge variant="outline" className="bg-white">{r.status}</Badge>
										</div>
										<div className="mt-1 text-sm text-muted-foreground">
											{r.requestType === 'PAUSE'
												? `${r.pauseStartDate || '?'} → ${r.pauseEndDate || '?'}`
												: `Delivery ${safeString(r.deliveryId).slice(0, 8)}… (${r.skipDate || '?'})`}
										</div>
										{r.reason ? <div className="mt-1 text-xs text-muted-foreground">Reason: {r.reason}</div> : null}
									</div>
								))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

