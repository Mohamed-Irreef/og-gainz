import { apiJson, apiJsonNoCache } from './apiClient';
import type { OrderGetResponse, OrdersListResponse, PublicOrder } from '@/types/ordersPhase5b';

export const ordersService = {
	async listMyOrders(args?: { page?: number; limit?: number; signal?: AbortSignal }): Promise<{
		items: PublicOrder[];
		meta: OrdersListResponse['data']['meta'];
	}> {
		const page = args?.page ?? 1;
		const limit = args?.limit ?? 20;
		const qs = new URLSearchParams({ page: String(page), limit: String(limit) });

		const res = await apiJson<OrdersListResponse>(`/orders?${qs.toString()}`, {
			method: 'GET',
			signal: args?.signal,
		});
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load orders');
		return { items: res.data.items, meta: res.data.meta };
	},

	async getMyOrderById(orderId: string, args?: { signal?: AbortSignal; noCache?: boolean }): Promise<PublicOrder> {
		const clean = String(orderId || '').trim();
		if (!clean) throw new Error('orderId is required');

		const fetcher = args?.noCache ? apiJsonNoCache : apiJson;
		const res = await fetcher<OrderGetResponse>(`/orders/${encodeURIComponent(clean)}`, {
			method: 'GET',
			signal: args?.signal,
		});
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load order');
		return res.data;
	},
};
