import { apiJson } from './apiClient';

export type AdminDeliveryStatus = 'PENDING' | 'COOKING' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'SKIPPED';
export type AdminDeliveryChangedBy = 'SYSTEM' | 'ADMIN' | 'KITCHEN';

export type AdminDailyDelivery = {
	_id?: string;
	id?: string;
	date: string;
	time: string;
	userId?: string;
	address?: {
		label?: string;
		addressLine1?: string;
		addressLine2?: string;
		city?: string;
		state?: string;
		pincode?: string;
		landmark?: string;
		latitude?: number;
		longitude?: number;
	};
	items?: Array<{
		orderId: string;
		cartItemId: string;
		type: string;
		plan: string;
		title: string;
		quantity: number;
	}>;
	status: AdminDeliveryStatus;
	statusHistory?: Array<{ status: AdminDeliveryStatus; changedAt: string; changedBy: AdminDeliveryChangedBy }>;
	createdAt?: string;
	updatedAt?: string;
};

type ListDeliveriesResponse = {
	status: 'success' | 'error';
	data: AdminDailyDelivery[];
	message?: string;
};

type SingleDeliveryResponse = {
	status: 'success' | 'error';
	data: AdminDailyDelivery;
	message?: string;
};

export const adminDeliveriesService = {
	async list(params: { date: string; signal?: AbortSignal }) {
		const query = new URLSearchParams();
		query.set('date', params.date);
		const res = await apiJson<ListDeliveriesResponse>(`/admin/deliveries?${query.toString()}`, { signal: params.signal });
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load deliveries');
		return res.data;
	},

	async get(deliveryId: string, options?: { signal?: AbortSignal }) {
		const res = await apiJson<SingleDeliveryResponse>(`/admin/deliveries/${encodeURIComponent(deliveryId)}`, { signal: options?.signal });
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load delivery');
		return res.data;
	},

	async updateStatus(deliveryId: string, status: AdminDeliveryStatus, options?: { signal?: AbortSignal }) {
		const res = await apiJson<SingleDeliveryResponse>(`/admin/deliveries/${encodeURIComponent(deliveryId)}/status`, {
			method: 'PATCH',
			body: JSON.stringify({ status }),
			signal: options?.signal,
		});
		if (res.status !== 'success') throw new Error(res.message || 'Failed to update delivery status');
		return res.data;
	},
};
