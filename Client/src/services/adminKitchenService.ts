import { apiJson, apiJsonNoCache } from './apiClient';

export type KitchenDeliveryStatus = 'PENDING' | 'COOKING' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'SKIPPED';
export type KitchenDeliveryChangedBy = 'SYSTEM' | 'ADMIN' | 'KITCHEN';

export type KitchenDelivery = {
	_id?: string;
	id?: string;

	// Backward compat
	date?: string;
	time?: string;

	// Phase 6D canonical
	deliveryDate?: string;
	deliveryTime?: string;
	groupKey?: string;

	userId?: string;
	user?: { id: string; name: string; contactNumber?: string };

	orderId?: string;
	subscriptionId?: string;

	address?: {
		label?: string;
		addressLine1?: string;
		addressLine2?: string;
		city?: string;
		state?: string;
		pincode?: string;
		landmark?: string;
	};

	items?: Array<{
		orderId: string;
		cartItemId: string;
		itemId?: string;
		title: string;
		name?: string;
		type: string;
		plan: string;
		quantity: number;
		servings?: number;
	}>;

	status: KitchenDeliveryStatus;
	statusHistory?: Array<{ status: KitchenDeliveryStatus; changedAt: string; changedBy: KitchenDeliveryChangedBy }>;

	createdAt?: string;
	updatedAt?: string;
};

type ListResponse = {
	status: 'success' | 'error';
	data: KitchenDelivery[];
	message?: string;
};

type SingleResponse = {
	status: 'success' | 'error';
	data: KitchenDelivery;
	message?: string;
};

export const adminKitchenService = {
	async list(params: { date?: string; status?: KitchenDeliveryStatus; userId?: string; signal?: AbortSignal }) {
		const query = new URLSearchParams();
		if (params.date) query.set('date', params.date);
		if (params.status) query.set('status', params.status);
		if (params.userId) query.set('userId', params.userId);

		const res = await apiJsonNoCache<ListResponse>(`/admin/kitchen/deliveries?${query.toString()}`, { signal: params.signal });
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load kitchen deliveries');
		return res.data;
	},

	async updateStatus(deliveryId: string, status: KitchenDeliveryStatus, options?: { signal?: AbortSignal }) {
		const res = await apiJson<SingleResponse>(`/admin/kitchen/deliveries/${encodeURIComponent(deliveryId)}/status`, {
			method: 'PATCH',
			body: JSON.stringify({ status }),
			signal: options?.signal,
		});
		if (res.status !== 'success') throw new Error(res.message || 'Failed to update kitchen delivery status');
		return res.data;
	},
};
