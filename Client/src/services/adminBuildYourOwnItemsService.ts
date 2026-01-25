import { apiJson, apiUpload } from './apiClient';
import type { BuildYourOwnItemEntity } from '@/types/buildYourOwn';

export const adminBuildYourOwnItemsService = {
	async list(params?: { page?: number; limit?: number; q?: string; isActive?: boolean; itemTypeId?: string }) {
		const search = new URLSearchParams();
		if (params?.page) search.set('page', String(params.page));
		if (params?.limit) search.set('limit', String(params.limit));
		if (params?.q) search.set('q', params.q);
		if (typeof params?.isActive === 'boolean') search.set('isActive', String(params.isActive));
		if (params?.itemTypeId) search.set('itemTypeId', params.itemTypeId);

		return apiJson<{
			status: 'success' | 'error';
			data: Array<BuildYourOwnItemEntity & { itemTypeRef?: any }>;
			meta: { page: number; limit: number; total: number; hasNextPage: boolean };
		}>(`/admin/byo-items?${search.toString()}`);
	},

	async createWithImage(formData: FormData) {
		return apiUpload<{ status: 'success' | 'error'; data: BuildYourOwnItemEntity }>(
			'/admin/byo-items',
			formData,
			{ method: 'POST' }
		);
	},

	async update(id: string, payload: Partial<BuildYourOwnItemEntity>) {
		return apiJson<{ status: 'success' | 'error'; data: BuildYourOwnItemEntity }>(
			`/admin/byo-items/${encodeURIComponent(id)}`,
			{ method: 'PUT', body: JSON.stringify(payload) }
		);
	},

	async softDelete(id: string) {
		return apiJson<{ status: 'success' | 'error'; data: BuildYourOwnItemEntity }>(
			`/admin/byo-items/${encodeURIComponent(id)}`,
			{ method: 'DELETE' }
		);
	},

	async uploadImage(id: string, file: File) {
		const form = new FormData();
		form.append('image', file);
		return apiUpload<{ status: 'success' | 'error'; data: BuildYourOwnItemEntity }>(
			`/admin/byo-items/${encodeURIComponent(id)}/image`,
			form,
			{ method: 'POST' }
		);
	},
};
