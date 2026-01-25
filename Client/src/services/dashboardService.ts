import { userService } from './userService';
import { customMealSubscriptionService } from './customMealSubscriptionService';
import { addonSubscriptionsService } from './addonSubscriptionsService';
import { deliveriesService, type MyDelivery } from './deliveriesService';
import { ordersService } from './ordersService';

import type { User } from '@/types';
import type { CustomMealSubscription, AddonSubscription } from '@/types/phase4';
import type { PublicOrder, PublicOrderItem } from '@/types/ordersPhase5b';
import { normalizeOrderFlags } from '@/types/ordersPhase5b';

const safeString = (v: unknown) => String(v || '').trim();

const toLocalISO = (d: Date) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
};

const addDaysISO = (iso: string, days: number) => {
	const s = safeString(iso);
	const d = new Date(`${s}T00:00:00`);
	if (Number.isNaN(d.getTime())) return s;
	d.setDate(d.getDate() + days);
	return toLocalISO(d);
};

const isWeekdayISO = (iso: string) => {
	const d = new Date(`${safeString(iso)}T00:00:00`);
	const day = d.getDay();
	return day !== 0 && day !== 6;
};

const getPlanLabel = (plan: string) => {
	const p = safeString(plan).toLowerCase();
	if (p === 'weekly') return 'Weekly';
	if (p === 'monthly') return 'Monthly';
	if (p === 'trial') return 'Trial';
	return 'Buy once';
};

const getPeriodDays = (plan: string) => {
	const p = safeString(plan).toLowerCase();
	if (p === 'monthly') return 28;
	if (p === 'weekly') return 7;
	if (p === 'trial') return 3;
	return 1;
};

const getDefaultTotalServings = (plan: string) => {
	const p = safeString(plan).toLowerCase();
	if (p === 'monthly') return 20;
	if (p === 'weekly') return 5;
	if (p === 'trial') return 3;
	return 1;
};

const getCurrentCycleStartISO = (baseStartISO: string, plan: string, todayISO: string) => {
	const base = safeString(baseStartISO);
	const today = safeString(todayISO);
	const periodDays = getPeriodDays(plan);

	const baseDate = new Date(`${base}T00:00:00`);
	const todayDate = new Date(`${today}T00:00:00`);
	if (Number.isNaN(baseDate.getTime()) || Number.isNaN(todayDate.getTime())) return base || today;

	const diffDays = Math.floor((todayDate.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000));
	const cycles = diffDays > 0 ? Math.floor(diffDays / periodDays) : 0;
	const start = new Date(baseDate);
	start.setDate(start.getDate() + cycles * periodDays);
	return toLocalISO(start);
};

const deliveryMatchesSubscription = (d: MyDelivery, subscriptionId: string) => {
	const subId = safeString(subscriptionId);
	if (!subId) return false;
	const direct = safeString(d.subscriptionId);
	if (direct && direct === subId) return true;
	return Boolean((d.items || []).some((it) => safeString(it.cartItemId) === subId));
};

const inferStartISO = (args: {
	baseStartISO?: string;
	subscriptionId: string;
	todayISO: string;
	history: MyDelivery[];
	window: MyDelivery[];
}) => {
	const base = safeString(args.baseStartISO);
	if (base) return base;
	const subId = safeString(args.subscriptionId);
	const candidates = [...(args.history || []), ...(args.window || [])]
		.filter((d) => deliveryMatchesSubscription(d, subId))
		.map((d) => safeString(d.date))
		.filter(Boolean)
		.sort();
	return candidates[0] || args.todayISO;
};

export type DashboardSubscription = {
	id: string;
	kind: 'mealPack' | 'customMeal' | 'addon';
	title: string;
	planLabel: string;
	status: 'active' | 'paused';
	delivered: number;
	total: number;
	remaining: number;
	progress: number;
	ctaHref: string;
};

export type DashboardData = {
	profile: User;
	activeSubscriptionsCount: number;
	pausedSubscriptionsCount: number;
	mealsRemaining: number;
	walletBalance: number;
	upcomingDeliveries: MyDelivery[];
	subscriptions: DashboardSubscription[];
	hasActiveSubscription: boolean;
	planSubtitle: string;
	ctaHref: string;
	ctaLabel: string;
	warnings?: string[];
};

const normalizeTitleFromOrderItem = (it: PublicOrderItem) => {
	const title = safeString(it.pricingSnapshot?.title);
	if (title) return title;
	if (it.type === 'meal') return 'Meal Pack';
	if (it.type === 'addon') return 'Add-on';
	return 'Build Your Own';
};

const buildOrderDerivedSubscriptions = (args: {
	orders: PublicOrder[];
	historyDeliveries: MyDelivery[];
	windowDeliveries: MyDelivery[];
	todayISO: string;
}): DashboardSubscription[] => {
	const paidOrders = (args.orders || []).filter((o) => normalizeOrderFlags({ status: o.status, paymentStatus: o.paymentStatus }).isPaid);
	const subs: DashboardSubscription[] = [];

	for (const order of paidOrders) {
		for (const it of order.items || []) {
			const plan = safeString(it.plan).toLowerCase();
			const subscriptionId = safeString(it.cartItemId);
			if (!subscriptionId) continue;

			const hasUpcoming = (args.windowDeliveries || []).some((d) => {
				const date = safeString(d.date);
				if (!date || date < args.todayISO) return false;
				return deliveryMatchesSubscription(d, subscriptionId);
			});
			if (!hasUpcoming) continue;

			const inferredStartISOVal = inferStartISO({
				baseStartISO: it.orderDetails?.startDate,
				subscriptionId,
				todayISO: args.todayISO,
				history: args.historyDeliveries,
				window: args.windowDeliveries,
			});

			const cycleStartISO = getCurrentCycleStartISO(inferredStartISOVal, plan, args.todayISO);
			const cycleEndISO = addDaysISO(cycleStartISO, getPeriodDays(plan) - 1);

			const total = getDefaultTotalServings(plan);
			const deliveredCount = (args.historyDeliveries || []).filter((d) => {
				if (!deliveryMatchesSubscription(d, subscriptionId)) return false;
				if (d.status !== 'DELIVERED') return false;
				const date = safeString(d.date);
				if (!date) return false;
				if (date < cycleStartISO || date > cycleEndISO) return false;
				return isWeekdayISO(date);
			}).length;

			const delivered = Math.max(0, Math.min(total, deliveredCount));
			const remaining = Math.max(0, total - delivered);
			const progress = total > 0 ? (delivered / total) * 100 : 0;

			subs.push({
				id: subscriptionId,
				kind: 'mealPack',
				title: normalizeTitleFromOrderItem(it),
				planLabel: getPlanLabel(plan),
				status: 'active',
				delivered,
				total,
				remaining,
				progress,
				ctaHref: `/dashboard/subscriptions/${encodeURIComponent(subscriptionId)}`,
			});
		}
	}

	const map = new Map<string, DashboardSubscription>();
	for (const s of subs) map.set(s.id, s);
	return Array.from(map.values());
};

const buildCustomMealSubscriptions = (args: {
	subs: CustomMealSubscription[];
	historyDeliveries: MyDelivery[];
	windowDeliveries: MyDelivery[];
	todayISO: string;
}): DashboardSubscription[] => {
	const out: DashboardSubscription[] = [];
	for (const s of args.subs || []) {
		const status = safeString(s.status) === 'paused' ? 'paused' : 'active';
		const plan = safeString(s.frequency);
		const total = getDefaultTotalServings(plan);
		const inferredStartISOVal = inferStartISO({
			baseStartISO: s.startDate,
			subscriptionId: s.id,
			todayISO: args.todayISO,
			history: args.historyDeliveries,
			window: args.windowDeliveries,
		});
		const cycleStartISO = getCurrentCycleStartISO(inferredStartISOVal, plan, args.todayISO);
		const cycleEndISO = addDaysISO(cycleStartISO, getPeriodDays(plan) - 1);
		const deliveredCount = (args.historyDeliveries || []).filter((d) => {
			if (!deliveryMatchesSubscription(d, s.id)) return false;
			if (d.status !== 'DELIVERED') return false;
			const date = safeString(d.date);
			if (!date) return false;
			if (date < cycleStartISO || date > cycleEndISO) return false;
			return isWeekdayISO(date);
		}).length;
		const delivered = Math.max(0, Math.min(total, deliveredCount));
		const remaining = Math.max(0, total - delivered);
		const progress = total > 0 ? (delivered / total) * 100 : 0;

		out.push({
			id: s.id,
			kind: 'customMeal',
			title: 'Custom Meal Plan',
			planLabel: getPlanLabel(plan),
			status,
			delivered,
			total,
			remaining,
			progress,
			ctaHref: `/dashboard/subscriptions`,
		});
	}
	return out;
};

const buildAddonSubscriptions = (args: {
	subs: AddonSubscription[];
	historyDeliveries: MyDelivery[];
	windowDeliveries: MyDelivery[];
	todayISO: string;
}): DashboardSubscription[] => {
	const out: DashboardSubscription[] = [];
	for (const s of args.subs || []) {
		const status = safeString(s.status) === 'paused' ? 'paused' : 'active';
		const plan = safeString(s.frequency);
		const total = typeof s.servings === 'number' && s.servings > 0 ? s.servings : getDefaultTotalServings(plan);
		const inferredStartISOVal = inferStartISO({
			baseStartISO: s.startDate,
			subscriptionId: s.id,
			todayISO: args.todayISO,
			history: args.historyDeliveries,
			window: args.windowDeliveries,
		});
		const cycleStartISO = getCurrentCycleStartISO(inferredStartISOVal, plan, args.todayISO);
		const cycleEndISO = addDaysISO(cycleStartISO, getPeriodDays(plan) - 1);
		const deliveredCount = (args.historyDeliveries || []).filter((d) => {
			if (!deliveryMatchesSubscription(d, s.id)) return false;
			if (d.status !== 'DELIVERED') return false;
			const date = safeString(d.date);
			if (!date) return false;
			if (date < cycleStartISO || date > cycleEndISO) return false;
			return isWeekdayISO(date);
		}).length;
		const delivered = Math.max(0, Math.min(total, deliveredCount));
		const remaining = Math.max(0, total - delivered);
		const progress = total > 0 ? (delivered / total) * 100 : 0;

		out.push({
			id: s.id,
			kind: 'addon',
			title: 'Add-on Subscription',
			planLabel: getPlanLabel(plan),
			status,
			delivered,
			total,
			remaining,
			progress,
			ctaHref: `/dashboard/subscriptions`,
		});
	}
	return out;
};

export const dashboardService = {
	async getDashboardData(userId: string, options?: { signal?: AbortSignal }): Promise<DashboardData> {
		const uid = safeString(userId);
		if (!uid) throw new Error('userId is required');

		const todayISO = toLocalISO(new Date());
		const plus3ISO = addDaysISO(todayISO, 3);
		const plus13ISO = addDaysISO(todayISO, 13);
		const minus30ISO = addDaysISO(todayISO, -30);

		const warnings: string[] = [];
		const settled = await Promise.allSettled([
			userService.getMe(),
			customMealSubscriptionService.listByUser(uid),
			addonSubscriptionsService.listByUser(uid),
			deliveriesService.listMy({ from: todayISO, to: plus3ISO, signal: options?.signal }),
			deliveriesService.listMy({ from: todayISO, to: plus13ISO, signal: options?.signal }),
			deliveriesService.listMy({ from: minus30ISO, to: todayISO, signal: options?.signal }),
			ordersService.listMyOrders({ page: 1, limit: 50, signal: options?.signal }),
		]);

		const profile = settled[0].status === 'fulfilled' ? settled[0].value : userService.getCurrentUser();
		if (!profile) {
			const reason = settled[0].status === 'rejected' ? settled[0].reason : undefined;
			const msg = (() => {
				if (typeof reason === 'string') return reason;
				if (reason && typeof reason === 'object' && 'message' in reason) return String((reason as { message?: unknown }).message || '');
				return 'Failed to load profile';
			})();
			throw new Error(msg || 'Failed to load profile');
		}
		if (settled[0].status === 'rejected') warnings.push('Profile may be outdated');

		const customSubs = settled[1].status === 'fulfilled' ? settled[1].value : [];
		if (settled[1].status === 'rejected') warnings.push('Custom meal subscriptions unavailable');

		const addonSubs = settled[2].status === 'fulfilled' ? settled[2].value : [];
		if (settled[2].status === 'rejected') warnings.push('Add-on subscriptions unavailable');

		const windowDeliveries3 = settled[3].status === 'fulfilled' ? settled[3].value : [];
		if (settled[3].status === 'rejected') warnings.push('Upcoming deliveries unavailable');

		const windowDeliveries14 = settled[4].status === 'fulfilled' ? settled[4].value : [];
		if (settled[4].status === 'rejected') warnings.push('Delivery history window unavailable');

		const historyDeliveries = settled[5].status === 'fulfilled' ? settled[5].value : [];
		if (settled[5].status === 'rejected') warnings.push('Delivery history unavailable');

		const ordersRes = settled[6].status === 'fulfilled' ? settled[6].value : { items: [], meta: { page: 1, limit: 50, total: 0, hasNextPage: false } };
		if (settled[6].status === 'rejected') warnings.push('Orders unavailable');

		const activeCustom = (customSubs || []).filter((s) => safeString(s.status) === 'active');
		const pausedCustom = (customSubs || []).filter((s) => safeString(s.status) === 'paused');
		const activeAddon = (addonSubs || []).filter((s) => safeString(s.status) === 'active');
		const pausedAddon = (addonSubs || []).filter((s) => safeString(s.status) === 'paused');

		const derivedMealPackSubs = buildOrderDerivedSubscriptions({
			orders: ordersRes.items,
			historyDeliveries: historyDeliveries || [],
			windowDeliveries: windowDeliveries14 || [],
			todayISO,
		});

		const customSnap = buildCustomMealSubscriptions({
			subs: customSubs || [],
			historyDeliveries: historyDeliveries || [],
			windowDeliveries: windowDeliveries14 || [],
			todayISO,
		});

		const addonSnap = buildAddonSubscriptions({
			subs: addonSubs || [],
			historyDeliveries: historyDeliveries || [],
			windowDeliveries: windowDeliveries14 || [],
			todayISO,
		});

		const snapshot = [...derivedMealPackSubs, ...customSnap, ...addonSnap].sort((a, b) => {
			if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
			return a.title.localeCompare(b.title);
		});

		const activeSubscriptionsCount = activeCustom.length + activeAddon.length + derivedMealPackSubs.length;
		const pausedSubscriptionsCount = pausedCustom.length + pausedAddon.length;
		const mealsRemaining = snapshot
			.filter((s) => s.status === 'active')
			.reduce((sum, s) => sum + (typeof s.remaining === 'number' ? s.remaining : 0), 0);
		const walletBalance = typeof profile.walletBalance === 'number' ? profile.walletBalance : 0;
		const hasActiveSubscription = activeSubscriptionsCount > 0;

		const planSubtitle = hasActiveSubscription ? 'Your meals are on track 🚀' : 'Start your fitness journey with our meal packs today!';
		const ctaHref = hasActiveSubscription ? '/dashboard/subscriptions' : '/meal-packs';
		const ctaLabel = hasActiveSubscription ? 'View My Subscriptions' : 'Explore Meal Packs';

		const upcomingDeliveries = (windowDeliveries3 || [])
			.slice()
			.sort((a, b) => {
				const ad = safeString(a.date);
				const bd = safeString(b.date);
				if (ad !== bd) return ad.localeCompare(bd);
				return safeString(a.time).localeCompare(safeString(b.time));
			})
			.slice(0, 2);

		return {
			profile,
			activeSubscriptionsCount,
			pausedSubscriptionsCount,
			mealsRemaining,
			walletBalance,
			upcomingDeliveries,
			subscriptions: snapshot,
			hasActiveSubscription,
			planSubtitle,
			ctaHref,
			ctaLabel,
			warnings: warnings.length ? warnings : undefined,
		};
	},
};
