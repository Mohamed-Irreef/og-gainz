import { apiJsonNoCache } from './apiClient';

export type AdminUserListItem = {
	userId: string;
	name?: string;
	email?: string;
	phone?: string;
	walletBalance?: number;
	isBlocked?: boolean;
	createdAt?: string;
	totalOrders?: number;
	activeSubscriptions?: number;
};

export type AdminUsersListResponse = {
	items: AdminUserListItem[];
	meta: { page: number; limit: number; total: number; hasNextPage: boolean };
};

export type AdminUserAddress = {
	label?: string;
	username?: string;
	contactNumber?: string;
	addressLine1?: string;
	addressLine2?: string;
	city?: string;
	state?: string;
	pincode?: string;
	landmark?: string;
	latitude?: number;
	longitude?: number;
	isDefault?: boolean;
};

export type AdminUserDetail = {
	userId: string;
	name?: string;
	email?: string;
	phone?: string;
	walletBalance?: number;
	createdAt?: string;
	isBlocked?: boolean;
	blockedAt?: string;
	blockedBy?: string;
	addresses?: AdminUserAddress[];
};

export type AdminUserSubscription = {
	id: string;
	kind: 'customMeal' | 'addon';
	frequency?: string;
	status?: string;
	startDate?: string;
	endDate?: string;
	mealName?: string;
	servingsDone?: number;
	totalServings?: number;
	createdAt?: string;
};

export type AdminUserOrder = {
	orderId: string;
	createdAt?: string;
	total: number;
	paymentStatus?: string;
	orderStatus?: string;
	paidAt?: string;
	acceptanceStatus?: string;
};

export type AdminUserWallet = {
	walletBalance: number;
	recentCredits: Array<{ orderId: string; amount: number; total: number; createdAt?: string }>;
};

export type AdminUserDelivery = {
	id: string;
	date?: string;
	time?: string;
	status?: string;
	itemsCount?: number;
};

export type AdminUserDeliveriesSummary = {
	today: AdminUserDelivery[];
	upcoming: AdminUserDelivery[];
	skippedCount: number;
};

type ApiEnvelope<T> = { status: 'success' | 'error'; data: T; message?: string };

export const adminUsersService = {
	async list(params?: { page?: number; limit?: number; status?: 'all' | 'active' | 'blocked'; search?: string; signal?: AbortSignal }) {
		const q = new URLSearchParams();
		if (params?.page) q.set('page', String(params.page));
		if (params?.limit) q.set('limit', String(params.limit));
		if (params?.status && params.status !== 'all') q.set('status', params.status);
		if (params?.search) q.set('search', params.search);

		const res = await apiJsonNoCache<ApiEnvelope<AdminUsersListResponse>>(`/admin/users?${q.toString()}`, { signal: params?.signal });
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load users');
		return res.data;
	},

	async getUser(userId: string, options?: { signal?: AbortSignal }) {
		const res = await apiJsonNoCache<ApiEnvelope<AdminUserDetail>>(`/admin/users/${encodeURIComponent(userId)}`, { signal: options?.signal });
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load user');
		return res.data;
	},

	async listSubscriptions(userId: string, options?: { signal?: AbortSignal }) {
		const res = await apiJsonNoCache<ApiEnvelope<AdminUserSubscription[]>>(`/admin/users/${encodeURIComponent(userId)}/subscriptions`, { signal: options?.signal });
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load subscriptions');
		return res.data;
	},

	async pauseAllSubscriptions(userId: string, options?: { signal?: AbortSignal }) {
		const res = await apiJsonNoCache<ApiEnvelope<{ pausedCustomMeal: number; pausedAddon: number }>>(
			`/admin/users/${encodeURIComponent(userId)}/subscriptions/pause-all`,
			{ method: 'POST', signal: options?.signal }
		);
		if (res.status !== 'success') throw new Error(res.message || 'Failed to pause subscriptions');
		return res.data;
	},

	async resumeAllSubscriptions(userId: string, options?: { signal?: AbortSignal }) {
		const res = await apiJsonNoCache<ApiEnvelope<{ resumedCustomMeal: number; resumedAddon: number }>>(
			`/admin/users/${encodeURIComponent(userId)}/subscriptions/resume-all`,
			{ method: 'POST', signal: options?.signal }
		);
		if (res.status !== 'success') throw new Error(res.message || 'Failed to resume subscriptions');
		return res.data;
	},

	async listOrders(userId: string, params?: { limit?: number; signal?: AbortSignal }) {
		const q = new URLSearchParams();
		if (params?.limit) q.set('limit', String(params.limit));
		const res = await apiJsonNoCache<ApiEnvelope<AdminUserOrder[]>>(
			`/admin/users/${encodeURIComponent(userId)}/orders?${q.toString()}`,
			{ signal: params?.signal }
		);
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load orders');
		return res.data;
	},

	async getWallet(userId: string, options?: { signal?: AbortSignal }) {
		const res = await apiJsonNoCache<ApiEnvelope<AdminUserWallet>>(`/admin/users/${encodeURIComponent(userId)}/wallet`, { signal: options?.signal });
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load wallet');
		return res.data;
	},

	async getDeliveries(userId: string, options?: { signal?: AbortSignal }) {
		const res = await apiJsonNoCache<ApiEnvelope<AdminUserDeliveriesSummary>>(
			`/admin/users/${encodeURIComponent(userId)}/deliveries`,
			{ signal: options?.signal }
		);
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load deliveries');
		return res.data;
	},

	async block(userId: string, options?: { signal?: AbortSignal }) {
		const res = await apiJsonNoCache<ApiEnvelope<{ userId: string; isBlocked: boolean; blockedAt?: string }>>(
			`/admin/users/${encodeURIComponent(userId)}/block`,
			{ method: 'PATCH', signal: options?.signal }
		);
		if (res.status !== 'success') throw new Error(res.message || 'Failed to block user');
		return res.data;
	},

	async unblock(userId: string, options?: { signal?: AbortSignal }) {
		const res = await apiJsonNoCache<ApiEnvelope<{ userId: string; isBlocked: boolean }>>(
			`/admin/users/${encodeURIComponent(userId)}/unblock`,
			{ method: 'PATCH', signal: options?.signal }
		);
		if (res.status !== 'success') throw new Error(res.message || 'Failed to unblock user');
		return res.data;
	},
};
