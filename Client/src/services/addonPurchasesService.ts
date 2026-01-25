import { USE_MOCKS } from '@/config/env';
import { apiJson } from './apiClient';
import type { AddonPurchase } from '@/types/phase4';

const STORAGE_KEY = 'oz-addon-purchases';

const load = (): AddonPurchase[] => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as AddonPurchase[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const save = (items: AddonPurchase[]) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const uid = () => `ap_${Math.random().toString(16).slice(2)}_${Date.now()}`;

export const addonPurchasesService = {
	async listByUser(userId: string): Promise<AddonPurchase[]> {
		if (USE_MOCKS) {
			return load().filter((p) => p.userId === userId);
		}

		const res = await apiJson<{ status: 'success' | 'error'; data: AddonPurchase[] }>(
			`/commerce/addon-purchases?userId=${encodeURIComponent(userId)}`
		);
		return res.data;
	},

	async create(input: { userId: string; addonId: string; quantity: number; price: number }): Promise<AddonPurchase> {
		if (USE_MOCKS) {
			const next: AddonPurchase = {
				id: uid(),
				userId: input.userId,
				addonId: input.addonId,
				quantity: input.quantity,
				price: input.price,
				status: 'pending',
				createdAt: new Date().toISOString(),
			};
			const all = load();
			all.unshift(next);
			save(all);
			return next;
		}

		const res = await apiJson<{ status: 'success' | 'error'; data: AddonPurchase }>(
			'/commerce/addon-purchases',
			{ method: 'POST', body: JSON.stringify(input) }
		);
		return res.data;
	},
};
