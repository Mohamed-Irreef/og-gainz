import { apiJsonNoCache, apiJson } from './apiClient';

export type AdminSubscriptionKind = 'customMeal' | 'addon';
export type AdminSubscriptionStatus = 'active' | 'paused';
export type AdminSubscriptionFrequency = 'weekly' | 'monthly' | 'trial';

export type AdminSubscription = {
	kind: AdminSubscriptionKind;
	id: string;
	userId: string;
	frequency: AdminSubscriptionFrequency;
	status: AdminSubscriptionStatus;
	startDate: string;
	createdAt?: string;
	updatedAt?: string;

	// customMeal
	selections?: Array<{ componentId: string; quantity: number }>;
	totals?: {
		proteinGrams: number;
		calories?: number;
		pricePerServing: number;
		weeklyPrice: number;
		monthlyPrice: number;
	};

	// addon
	addonId?: string;
	servings?: number;
	price?: number;
};

type ListResponse = {
	status: 'success' | 'error';
	data: AdminSubscription[];
	message?: string;
};

type SingleResponse = {
	status: 'success' | 'error';
	data: AdminSubscription;
	message?: string;
};

export const adminSubscriptionsService = {
	async list(params?: {
		frequency?: 'weekly' | 'monthly' | 'all';
		status?: 'active' | 'paused' | 'all';
		type?: 'customMeal' | 'addon' | 'all';
		limit?: number;
		signal?: AbortSignal;
	}) {
		const query = new URLSearchParams();
		if (params?.frequency) query.set('frequency', params.frequency);
		if (params?.status) query.set('status', params.status);
		if (params?.type) query.set('type', params.type);
		if (params?.limit) query.set('limit', String(params.limit));

		const res = await apiJsonNoCache<ListResponse>(`/admin/subscriptions?${query.toString()}`, { signal: params?.signal });
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load subscriptions');
		return res.data;
	},

	async setStatus(kind: AdminSubscriptionKind, id: string, status: AdminSubscriptionStatus, options?: { signal?: AbortSignal }) {
		const res = await apiJson<SingleResponse>(`/admin/subscriptions/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/status`, {
			method: 'PATCH',
			body: JSON.stringify({ status }),
			signal: options?.signal,
		});
		if (res.status !== 'success') throw new Error(res.message || 'Failed to update subscription');
		return res.data;
	},
};
