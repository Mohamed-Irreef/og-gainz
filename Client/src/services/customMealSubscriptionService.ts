import { USE_MOCKS } from '@/config/env';
import { apiJson } from './apiClient';
import type { CustomMealSubscription, CustomMealSelection, CustomMealTotals, Frequency } from '@/types/phase4';

const STORAGE_KEY = 'oz-custom-meal-subscriptions';

const load = (): CustomMealSubscription[] => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as CustomMealSubscription[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const save = (items: CustomMealSubscription[]) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const uid = () => `cms_${Math.random().toString(16).slice(2)}_${Date.now()}`;

export const customMealSubscriptionService = {
	async listByUser(userId: string): Promise<CustomMealSubscription[]> {
		if (USE_MOCKS) {
			return load().filter((s) => s.userId === userId);
		}

		const res = await apiJson<{ status: 'success' | 'error'; data: CustomMealSubscription[] }>(
			`/commerce/custom-meal-subscriptions?userId=${encodeURIComponent(userId)}`
		);
		return res.data;
	},

	async create(input: {
		userId: string;
		frequency: Frequency;
		startDate: string;
		selections: CustomMealSelection[];
		totals: CustomMealTotals;
	}): Promise<CustomMealSubscription> {
		if (USE_MOCKS) {
			const next: CustomMealSubscription = {
				id: uid(),
				userId: input.userId,
				frequency: input.frequency,
				startDate: input.startDate,
				selections: input.selections,
				totals: input.totals,
				status: 'active',
				createdAt: new Date().toISOString(),
			};
			const all = load();
			all.unshift(next);
			save(all);
			window.dispatchEvent(new CustomEvent('og:dashboard-refresh'));
			return next;
		}

		const res = await apiJson<{ status: 'success' | 'error'; data: CustomMealSubscription }>(
			'/commerce/custom-meal-subscriptions',
			{ method: 'POST', body: JSON.stringify(input) }
		);
		window.dispatchEvent(new CustomEvent('og:dashboard-refresh'));
		return res.data;
	},

	async setStatus(id: string, status: 'active' | 'paused') {
		if (USE_MOCKS) {
			const all = load();
			const idx = all.findIndex((s) => s.id === id);
			if (idx >= 0) {
				all[idx] = { ...all[idx], status };
				save(all);
				window.dispatchEvent(new CustomEvent('og:dashboard-refresh'));
				return all[idx];
			}
			return null;
		}

		const res = await apiJson<{ status: 'success' | 'error'; data: CustomMealSubscription }>(
			`/commerce/custom-meal-subscriptions/${encodeURIComponent(id)}/status`,
			{ method: 'PATCH', body: JSON.stringify({ status }) }
		);
		window.dispatchEvent(new CustomEvent('og:dashboard-refresh'));
		return res.data;
	},
};
