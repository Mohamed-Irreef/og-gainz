import { apiJson, apiJsonNoCache } from './apiClient';
import type { PauseSkipRequest, PauseSkipRequestStatus, PauseSkipRequestType, PauseSkipRequestKind } from '@/types';

type ListResponse = {
	status: 'success' | 'error';
	data: PauseSkipRequest[];
	message?: string;
};

type SingleResponse = {
	status: 'success' | 'error';
	data: PauseSkipRequest;
	message?: string;
};

export const adminPauseSkipService = {
	async listRequests(params?: {
		status?: PauseSkipRequestStatus;
		requestType?: PauseSkipRequestType;
		kind?: PauseSkipRequestKind;
		userId?: string;
		limit?: number;
		signal?: AbortSignal;
	}) {
		const query = new URLSearchParams();
		if (params?.status) query.set('status', params.status);
		if (params?.requestType) query.set('requestType', params.requestType);
		if (params?.kind) query.set('kind', params.kind);
		if (params?.userId) query.set('userId', params.userId);
		if (params?.limit) query.set('limit', String(params.limit));

		const res = await apiJsonNoCache<ListResponse>(`/admin/pause-skip/requests?${query.toString()}`, { signal: params?.signal });
		if (res.status !== 'success') throw new Error(res.message || 'Failed to load requests');
		return res.data;
	},

	async decideRequest(requestId: string, input: { status: 'APPROVED' | 'DECLINED'; adminNote?: string }, options?: { signal?: AbortSignal }) {
		const res = await apiJson<SingleResponse>(`/admin/pause-skip/requests/${encodeURIComponent(requestId)}`, {
			method: 'PATCH',
			body: JSON.stringify(input),
			signal: options?.signal,
		});
		if (res.status !== 'success') throw new Error(res.message || 'Failed to update request');
		return res.data;
	},
};
