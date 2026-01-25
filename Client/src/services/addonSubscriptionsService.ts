import { USE_MOCKS } from '@/config/env';
import { apiJson } from './apiClient';
import type { AddonSubscription, Frequency } from '@/types/phase4';

const STORAGE_KEY = 'oz-addon-subscriptions';

const load = (): AddonSubscription[] => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as AddonSubscription[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const save = (items: AddonSubscription[]) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const uid = () => `as_${Math.random().toString(16).slice(2)}_${Date.now()}`;

export const addonSubscriptionsService = {
	async listByUser(userId: string): Promise<AddonSubscription[]> {
		if (USE_MOCKS) {
			return load().filter((s) => s.userId === userId);
		}

		const res = await apiJson<{ status: 'success' | 'error'; data: AddonSubscription[] }>(
			`/commerce/addon-subscriptions?userId=${encodeURIComponent(userId)}`
		);
		return res.data;
	},

	async create(input: {
		userId: string;
		addonId: string;
		frequency: Frequency;
		servings: number;
		price: number;
		startDate: string;
	}): Promise<AddonSubscription> {
		if (USE_MOCKS) {
			const next: AddonSubscription = {
				id: uid(),
				userId: input.userId,
				addonId: input.addonId,
				frequency: input.frequency,
				servings: input.servings,
				price: input.price,
				startDate: input.startDate,
				status: 'active',
				createdAt: new Date().toISOString(),
			};
			const all = load();
			all.unshift(next);
			save(all);
			window.dispatchEvent(new CustomEvent('og:dashboard-refresh'));
			return next;
		}

		const res = await apiJson<{ status: 'success' | 'error'; data: AddonSubscription }>(
			'/commerce/addon-subscriptions',
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

		const res = await apiJson<{ status: 'success' | 'error'; data: AddonSubscription }>(
			`/commerce/addon-subscriptions/${encodeURIComponent(id)}/status`,
			{ method: 'PATCH', body: JSON.stringify({ status }) }
		);
		window.dispatchEvent(new CustomEvent('og:dashboard-refresh'));
		return res.data;
	},
};
