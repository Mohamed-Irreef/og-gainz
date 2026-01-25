import { apiJson } from './apiClient';
import type { BuildYourOwnItemTypeEntity } from '@/types/buildYourOwn';

export const adminBuildYourOwnItemTypesService = {
	async list(params?: { page?: number; limit?: number; q?: string; isActive?: boolean }) {
		const search = new URLSearchParams();
		if (params?.page) search.set('page', String(params.page));
		if (params?.limit) search.set('limit', String(params.limit));
		if (params?.q) search.set('q', params.q);
		if (typeof params?.isActive === 'boolean') search.set('isActive', String(params.isActive));

		return apiJson<{
			status: 'success' | 'error';
			data: BuildYourOwnItemTypeEntity[];
			meta: { page: number; limit: number; total: number; hasNextPage: boolean };
		}>(`/admin/byo-item-types?${search.toString()}`);
	},

	async create(payload: Partial<BuildYourOwnItemTypeEntity>) {
		return apiJson<{ status: 'success' | 'error'; data: BuildYourOwnItemTypeEntity }>(
			'/admin/byo-item-types',
			{ method: 'POST', body: JSON.stringify(payload) }
		);
	},

	async update(id: string, payload: Partial<BuildYourOwnItemTypeEntity>) {
		return apiJson<{ status: 'success' | 'error'; data: BuildYourOwnItemTypeEntity }>(
			`/admin/byo-item-types/${encodeURIComponent(id)}`,
			{ method: 'PUT', body: JSON.stringify(payload) }
		);
	},

	async softDelete(id: string) {
		return apiJson<{ status: 'success' | 'error'; data: BuildYourOwnItemTypeEntity }>(
			`/admin/byo-item-types/${encodeURIComponent(id)}`,
			{ method: 'DELETE' }
		);
	},
};
