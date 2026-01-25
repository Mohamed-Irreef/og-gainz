import { apiJsonNoCache } from './apiClient';

export type DeliveryStatus = 'PENDING' | 'COOKING' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'SKIPPED';

export type MyDelivery = {
	_id?: string;
	id?: string;
	date: string;
	time: string;
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
		type: string;
		plan: string;
		title: string;
		quantity: number;
	}>;
	status: DeliveryStatus;
	statusHistory?: Array<{ status: DeliveryStatus; changedAt: string; changedBy: 'SYSTEM' | 'ADMIN' | 'KITCHEN' }>;
	createdAt?: string;
	updatedAt?: string;
};

type ListMyDeliveriesResponse = {
	status: 'success' | 'error';
	data: MyDelivery[];
	message?: string;
};

export const deliveriesService = {
	async listMy(params: { from: string; to: string; signal?: AbortSignal }) {
		const query = new URLSearchParams();
		query.set('from', params.from);
		query.set('to', params.to);
		const res = await apiJsonNoCache<ListMyDeliveriesResponse>(`/deliveries/my?${query.toString()}`, { signal: params.signal });
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load deliveries');
		return res.data;
	},
};
