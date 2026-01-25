import { useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';

import { deliveriesService, type MyDelivery, type DeliveryStatus } from '@/services/deliveriesService';
import { pauseSkipService } from '@/services/pauseSkipService';
import type { PauseSkipRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';

const safeString = (v: unknown) => String(v || '').trim();

const toLocalISODate = (d: Date) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
};

const addDays = (d: Date, days: number) => {
	const copy = new Date(d);
	copy.setDate(copy.getDate() + days);
	return copy;
};

const statusBadgeClass = (status: DeliveryStatus) => {
	switch (status) {
		case 'PENDING':
			return 'bg-slate-100 text-slate-900 border-slate-200';
		case 'COOKING':
			return 'bg-orange-100 text-orange-900 border-orange-200';
		case 'PACKED':
			return 'bg-blue-100 text-blue-900 border-blue-200';
		case 'OUT_FOR_DELIVERY':
			return 'bg-purple-100 text-purple-900 border-purple-200';
		case 'DELIVERED':
			return 'bg-green-100 text-green-900 border-green-200';
		case 'SKIPPED':
			return 'bg-red-100 text-red-900 border-red-200';
		default:
			return 'bg-muted text-muted-foreground border';
	}
};

const SKIP_REQUEST_CUTOFF_HHMM = (() => {
	const raw = String((import.meta as unknown as { env?: Record<string, unknown> })?.env?.VITE_SKIP_REQUEST_CUTOFF_HHMM || '').trim();
	return /^([0-9]{1,2}):([0-9]{2})$/.test(raw) ? raw : '06:00';
})();

const parseHHmm = (hhmm: string) => {
	const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(hhmm.trim());
	if (!m) return undefined;
	const hh = Number(m[1]);
	const mm = Number(m[2]);
	if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return undefined;
	return { hh, mm };
};

const isBeforeTodayCutoff = (now: Date, cutoffHHmm: string) => {
	const parsed = parseHHmm(cutoffHHmm);
	if (!parsed) return true;
	const cutoff = new Date(now);
	cutoff.setHours(parsed.hh, parsed.mm, 0, 0);
	return now.getTime() < cutoff.getTime();
};

const isWithinInclusiveISODateRange = (dateISO: string, startISO?: string, endISO?: string) => {
	if (!startISO || !endISO) return false;
	return startISO <= dateISO && dateISO <= endISO;
};

export default function Deliveries() {
	const { toast } = useToast();

	const [selectedDate, setSelectedDate] = useState(() => toLocalISODate(new Date()));
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deliveries, setDeliveries] = useState<MyDelivery[]>([]);
	const [requests, setRequests] = useState<PauseSkipRequest[]>([]);

	const [skipDialogOpen, setSkipDialogOpen] = useState(false);
	const [skipDelivery, setSkipDelivery] = useState<MyDelivery | null>(null);
	const [skipReason, setSkipReason] = useState('');
	const [skipSubmitting, setSkipSubmitting] = useState(false);

	const [viewDialogOpen, setViewDialogOpen] = useState(false);
	const [viewDelivery, setViewDelivery] = useState<MyDelivery | null>(null);

	const windowFrom = useMemo(() => {
		const today = new Date();
		return toLocalISODate(today);
	}, []);

	const windowTo = useMemo(() => {
		const today = new Date();
		return toLocalISODate(addDays(today, 13));
	}, []);

	useEffect(() => {
		let mounted = true;
		let controller = new AbortController();

		const load = async (opts?: { silent?: boolean }) => {
			if (!opts?.silent) {
				setLoading(true);
				setError(null);
			}
			try {
				const [deliveriesRes, requestsRes] = await Promise.all([
					deliveriesService.listMy({ from: windowFrom, to: windowTo, signal: controller.signal }),
					pauseSkipService.listMyRequests({ signal: controller.signal }),
				]);
				if (!mounted) return;
				setDeliveries(deliveriesRes || []);
				setRequests(requestsRes || []);
			} catch (e: unknown) {
				if (!mounted) return;
				setError(safeString((e as { message?: unknown })?.message || e) || 'Failed to load deliveries');
			} finally {
				if (mounted && !opts?.silent) setLoading(false);
			}
		};

		load();
		const interval = window.setInterval(() => {
			// Silent refresh to reflect kitchen status changes.
			controller.abort();
			controller = new AbortController();
			load({ silent: true });
		}, 20_000);

		return () => {
			mounted = false;
			controller.abort();
			window.clearInterval(interval);
		};
	}, [windowFrom, windowTo]);

	const todayStr = useMemo(() => toLocalISODate(new Date()), []);

	const pauseWindowsBySubscriptionId = useMemo(() => {
		const map = new Map<string, Array<{ start: string; end: string; reason?: string }>>();
		for (const r of requests) {
			if (r.requestType !== 'PAUSE') continue;
			if (r.status !== 'APPROVED') continue;
			const subId = safeString(r.subscriptionId);
			if (!subId) continue;
			const start = safeString(r.pauseStartDate);
			const end = safeString(r.pauseEndDate);
			if (!start || !end) continue;
			if (!map.has(subId)) map.set(subId, []);
			map.get(subId)!.push({ start, end, reason: r.reason });
		}
		return map;
	}, [requests]);

	const pendingSkipByDeliveryId = useMemo(() => {
		const map = new Map<string, PauseSkipRequest>();
		for (const r of requests) {
			if (r.requestType !== 'SKIP') continue;
			if (r.status !== 'PENDING') continue;
			const did = safeString(r.deliveryId);
			if (!did) continue;
			map.set(did, r);
		}
		return map;
	}, [requests]);

	const approvedSkipByDeliveryId = useMemo(() => {
		const map = new Map<string, PauseSkipRequest>();
		for (const r of requests) {
			if (r.requestType !== 'SKIP') continue;
			if (r.status !== 'APPROVED') continue;
			const did = safeString(r.deliveryId);
			if (!did) continue;
			map.set(did, r);
		}
		return map;
	}, [requests]);

	const openSkipDialog = (d: MyDelivery) => {
		setSkipDelivery(d);
		setSkipReason('');
		setSkipDialogOpen(true);
	};

	const openViewDialog = (d: MyDelivery) => {
		setViewDelivery(d);
		setViewDialogOpen(true);
	};

	const deliveryStatusLabel = (status: MyDelivery['status']) => {
		switch (status) {
			case 'PENDING':
				return 'Pending';
			case 'COOKING':
				return 'Cooking';
			case 'PACKED':
				return 'Packed';
			case 'OUT_FOR_DELIVERY':
				return 'Out for delivery';
			case 'DELIVERED':
				return 'Delivered';
			case 'SKIPPED':
				return 'Skipped';
			default:
				return String(status).replaceAll('_', ' ');
		}
	};

	const canRequestSkip = (d: MyDelivery) => {
		const now = new Date();
		const id = safeString(d._id || d.id);
		if (!id) return { ok: false, reason: 'Invalid delivery' };
		if (safeString(d.date) !== todayStr) return { ok: false, reason: 'Skip requests are available only for today' };
		if (d.status !== 'PENDING') return { ok: false, reason: `Cannot request skip when status is ${d.status}` };
		if (!isBeforeTodayCutoff(now, SKIP_REQUEST_CUTOFF_HHMM)) {
			return { ok: false, reason: `Skip requests must be submitted at least ${SKIP_REQUEST_CUTOFF_HHMM} before delivery time.` };
		}
		if (pendingSkipByDeliveryId.has(id)) return { ok: false, reason: 'A skip request for this delivery is already pending.' };

		const subId = safeString(d.subscriptionId);
		if (subId) {
			const windows = pauseWindowsBySubscriptionId.get(subId) || [];
			if (windows.some((w) => isWithinInclusiveISODateRange(d.date, w.start, w.end))) {
				return { ok: false, reason: 'This delivery is paused.' };
			}
		}

		return { ok: true, reason: '' };
	};

	const onSubmitSkip = async () => {
		const d = skipDelivery;
		if (!d) return;
		const id = safeString(d._id || d.id);
		if (!id) return;
		const trimmedReason = safeString(skipReason);
		if (!trimmedReason) {
			toast({ title: 'Reason is required', description: 'Please enter a reason for skipping this delivery.', variant: 'destructive' });
			return;
		}

		setSkipSubmitting(true);
		try {
			await pauseSkipService.requestSkipDelivery({ deliveryId: id, reason: trimmedReason });
			toast({ title: 'Skip requested', description: 'Your request has been sent for admin approval.' });
			setSkipDialogOpen(false);
			const controller = new AbortController();
			const [deliveriesRes, requestsRes] = await Promise.all([
				deliveriesService.listMy({ from: windowFrom, to: windowTo, signal: controller.signal }),
				pauseSkipService.listMyRequests({ signal: controller.signal }),
			]);
			setDeliveries(deliveriesRes || []);
			setRequests(requestsRes || []);
		} catch (e: unknown) {
			toast({
				title: 'Failed to request skip',
				description: safeString((e as { message?: unknown })?.message || e) || 'Request failed',
				variant: 'destructive',
			});
		} finally {
			setSkipSubmitting(false);
		}
	};

	const byDate = useMemo(() => {
		const map = new Map<string, MyDelivery[]>();
		for (const d of deliveries) {
			const key = safeString(d.date);
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(d);
		}
		for (const [k, arr] of map.entries()) {
			arr.sort((a, b) => safeString(a.time).localeCompare(safeString(b.time)));
			map.set(k, arr);
		}
		return map;
	}, [deliveries]);

	const todaysDeliveries = byDate.get(selectedDate) || [];

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 className="text-2xl font-semibold text-oz-primary">Deliveries</h2>
					<p className="text-sm text-muted-foreground">Your upcoming deliveries (next 14 days).</p>
				</div>
				<div className="w-44">
					<Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={windowFrom} max={windowTo} />
				</div>
			</div>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Could not load deliveries</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader className="flex items-center justify-between sm:flex-row flex-col gap-2">
					<CardTitle className="text-lg">{selectedDate}</CardTitle>
					<div className="text-sm text-muted-foreground">{todaysDeliveries.length} deliveries</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-3">
							{Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="flex items-center gap-3">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-4 w-48" />
									<Skeleton className="h-4 w-24" />
								</div>
							))}
						</div>
					) : todaysDeliveries.length === 0 ? (
						<div className="py-10 text-center text-sm text-muted-foreground">No deliveries scheduled for this day.</div>
					) : (
						<div className="space-y-3">
							{todaysDeliveries.map((d) => {
								const id = safeString(d._id || d.id);
								const addressLabel = safeString(d.address?.label) || '—';
								const addr = [d.address?.addressLine1, d.address?.city, d.address?.pincode].filter(Boolean).join(', ');
								const subId = safeString(d.subscriptionId);
								const pauseWindows = subId ? pauseWindowsBySubscriptionId.get(subId) || [] : [];
								const activePause = pauseWindows.find((w) => isWithinInclusiveISODateRange(d.date, w.start, w.end));
								const pendingSkip = id ? pendingSkipByDeliveryId.get(id) : undefined;
								const approvedSkip = id ? approvedSkipByDeliveryId.get(id) : undefined;
								const skipEligibility = canRequestSkip(d);
								const showStatusBadge = !(activePause && d.status === 'PENDING');
								return (
									<div key={id} className="rounded-lg border border-oz-neutral/40 p-4 space-y-2">
										<div className="flex items-center justify-between gap-3">
											<div className="font-medium">{d.time}</div>
											<div className="flex items-center gap-2">
												{pendingSkip ? (
													<Badge variant="outline" className="bg-yellow-100 text-yellow-900 border-yellow-200">Skip Requested</Badge>
												) : null}
												{activePause ? (
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<span>
																	<Badge variant="outline" className="bg-yellow-50 text-yellow-900 border-yellow-200">Paused</Badge>
																</span>
															</TooltipTrigger>
															<TooltipContent>
																This delivery is paused between {activePause.start} and {activePause.end}.
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												) : null}
												{showStatusBadge ? (
													d.status === 'SKIPPED' ? (
														<TooltipProvider>
															<Tooltip>
																<TooltipTrigger asChild>
																	<span>
																		<Badge variant="outline" className={statusBadgeClass(d.status)}>
																			{deliveryStatusLabel(d.status)}
																		</Badge>
																	</span>
															</TooltipTrigger>
															<TooltipContent>
																This delivery was skipped after admin approval.
																{approvedSkip?.reason ? ` Reason: ${approvedSkip.reason}` : ''}
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
													) : (
														<Badge variant="outline" className={statusBadgeClass(d.status)}>{deliveryStatusLabel(d.status)}</Badge>
													)
												) : null}
											</div>
										</div>
										<div className="text-sm">{addressLabel}</div>
										<div className="text-xs text-muted-foreground">{addr || '—'}</div>
										<div className="pt-2 flex flex-wrap gap-2">
											<Button size="sm" variant="outline" onClick={() => openViewDialog(d)}>
												View
											</Button>
											{safeString(d.date) === todayStr ? (
												pendingSkip ? (
													<Button size="sm" variant="outline" disabled>
														Skip Requested
													</Button>
												) : skipEligibility.ok ? (
													<Button size="sm" onClick={() => openSkipDialog(d)}>
														Request Skip
													</Button>
												) : (
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<span>
																	<Button size="sm" variant="outline" disabled>
																	Request Skip
																</Button>
																</span>
															</TooltipTrigger>
														<TooltipContent>
															{activePause
																? `This delivery is paused between ${activePause.start} and ${activePause.end}.`
																: skipEligibility.reason}
														</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												)
											) : null}
										</div>
										<div className="space-y-1 text-sm">
											{(d.items || []).map((it) => (
												<div key={it.cartItemId} className="flex items-center justify-between">
													<div className="truncate">{it.title}</div>
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

			<Dialog
				open={viewDialogOpen}
				onOpenChange={(open) => {
					setViewDialogOpen(open);
					if (!open) setViewDelivery(null);
				}}
			>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Delivery details</DialogTitle>
						<DialogDescription>Items scheduled for this delivery.</DialogDescription>
					</DialogHeader>

					{viewDelivery ? (
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="rounded-md border p-3">
									<div className="text-xs text-muted-foreground">Date</div>
									<div className="text-sm font-medium">{safeString(viewDelivery.date) || '—'}</div>
									<div className="text-xs text-muted-foreground mt-1">Time: {safeString(viewDelivery.time) || '—'}</div>
								</div>
								<div className="rounded-md border p-3">
									<div className="text-xs text-muted-foreground">Status</div>
									<div className="mt-1">
										<Badge variant="outline" className={statusBadgeClass(viewDelivery.status)}>
											{deliveryStatusLabel(viewDelivery.status)}
										</Badge>
									</div>
									{safeString(viewDelivery.subscriptionId) ? (
										<div className="text-xs text-muted-foreground mt-2">Subscription: {safeString(viewDelivery.subscriptionId).slice(0, 8)}…</div>
									) : null}
								</div>
							</div>

							<div className="rounded-md border p-3">
								<div className="text-sm font-medium">Address</div>
								<div className="text-sm mt-1">{safeString(viewDelivery.address?.label) || '—'}</div>
								<div className="text-xs text-muted-foreground mt-1">
									{[viewDelivery.address?.addressLine1, viewDelivery.address?.addressLine2, viewDelivery.address?.city, viewDelivery.address?.state, viewDelivery.address?.pincode]
										.filter(Boolean)
										.join(', ') || '—'}
								</div>
							</div>

							<div className="space-y-2">
								<div className="text-sm font-medium">Items</div>
								{(viewDelivery.items || []).length === 0 ? (
									<div className="text-sm text-muted-foreground">No items for this delivery.</div>
								) : (
									<div className="space-y-2">
										{(viewDelivery.items || []).map((it) => (
											<div key={it.cartItemId} className="rounded-md border p-3">
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<div className="font-medium truncate">{safeString(it.title) || 'Item'}</div>
														<div className="text-xs text-muted-foreground mt-1">
															{safeString(it.type)} · <span className="capitalize">{safeString(it.plan)}</span>
															{safeString(it.orderId) ? <> · Order {safeString(it.orderId).slice(0, 8)}…</> : null}
													</div>
												</div>
												<div className="shrink-0 text-sm text-muted-foreground">Qty {it.quantity}</div>
											</div>
											<div className="text-xs text-muted-foreground mt-2">Subscription item: {safeString(it.cartItemId).slice(0, 8)}…</div>
										</div>
										))}
									</div>
								)}
							</div>
						</div>
					) : (
						<div className="text-sm text-muted-foreground">No delivery selected.</div>
					)}
				</DialogContent>
			</Dialog>

			<Dialog
				open={skipDialogOpen}
				onOpenChange={(open) => {
					setSkipDialogOpen(open);
					if (!open) {
						setSkipDelivery(null);
						setSkipReason('');
						setSkipSubmitting(false);
					}
				}}
			>
				<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Request Skip</DialogTitle>
						<DialogDescription>This will send a skip request to admin for approval.</DialogDescription>
					</DialogHeader>

					<div className="space-y-2">
						<div className="text-sm text-muted-foreground">Reason (required)</div>
						<Textarea
							value={skipReason}
							onChange={(e) => setSkipReason(e.target.value)}
							placeholder="E.g. traveling, not available, etc."
							rows={4}
						/>
					</div>

					<DialogFooter>
						<Button variant="outline" disabled={skipSubmitting} onClick={() => setSkipDialogOpen(false)}>
							Cancel
						</Button>
						<Button disabled={skipSubmitting} onClick={onSubmitSkip}>
							{skipSubmitting ? 'Submitting…' : 'Submit Request'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
