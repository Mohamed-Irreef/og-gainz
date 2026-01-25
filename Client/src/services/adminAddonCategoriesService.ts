import { apiJson } from './apiClient';
import type { AddonCategoryEntity, PaginatedResponse, SingleResponse } from '@/types/catalog';

type ApiAddonCategory = Omit<AddonCategoryEntity, 'id'> & { _id?: string };

const toCategory = (input: ApiAddonCategory): AddonCategoryEntity => {
	return {
		id: String(input._id || (input as unknown as { id?: string }).id || ''),
		name: input.name,
		slug: input.slug,
		description: input.description,
		displayOrder: input.displayOrder,
		isActive: input.isActive,
		deletedAt: input.deletedAt,
		createdAt: input.createdAt,
		updatedAt: input.updatedAt,
	};
};

export const adminAddonCategoriesService = {
	async list(params?: { page?: number; limit?: number; q?: string; isActive?: boolean }) {
		const query = new URLSearchParams();
		if (params?.page) query.set('page', String(params.page));
		if (params?.limit) query.set('limit', String(params.limit));
		if (params?.q) query.set('q', params.q);
		if (typeof params?.isActive === 'boolean') query.set('isActive', String(params.isActive));

		const result = await apiJson<PaginatedResponse<ApiAddonCategory>>(`/admin/addon-categories?${query.toString()}`);
		return { ...result, data: result.data.map(toCategory) } satisfies PaginatedResponse<AddonCategoryEntity>;
	},

	async create(payload: Partial<AddonCategoryEntity>) {
		const result = await apiJson<SingleResponse<ApiAddonCategory>>('/admin/addon-categories', {
			method: 'POST',
			body: JSON.stringify(payload),
		});
		return { ...result, data: toCategory(result.data) } satisfies SingleResponse<AddonCategoryEntity>;
	},

	async update(id: string, payload: Partial<AddonCategoryEntity>) {
		const result = await apiJson<SingleResponse<ApiAddonCategory>>(`/admin/addon-categories/${encodeURIComponent(id)}`,
			{
				method: 'PUT',
				body: JSON.stringify(payload),
			}
		);
		return { ...result, data: toCategory(result.data) } satisfies SingleResponse<AddonCategoryEntity>;
	},

	async softDelete(id: string) {
		const result = await apiJson<SingleResponse<ApiAddonCategory>>(`/admin/addon-categories/${encodeURIComponent(id)}`,
			{
				method: 'DELETE',
			}
		);
		return { ...result, data: toCategory(result.data) } satisfies SingleResponse<AddonCategoryEntity>;
	},

	async hardDelete(id: string) {
		const result = await apiJson<SingleResponse<ApiAddonCategory>>(
			`/admin/addon-categories/${encodeURIComponent(id)}?hard=true`,
			{
				method: 'DELETE',
			}
		);
		return { ...result, data: toCategory(result.data) } satisfies SingleResponse<AddonCategoryEntity>;
	},
};
