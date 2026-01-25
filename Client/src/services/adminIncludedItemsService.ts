import { apiJson } from './apiClient';
import type { PaginatedResponse, SingleResponse, IncludedItemEntity } from '@/types/catalog';

type ApiIncludedItem = Omit<IncludedItemEntity, 'id'> & { _id?: string };

const toIncludedItem = (input: ApiIncludedItem): IncludedItemEntity => ({
	id: String(input._id || (input as unknown as { id?: string }).id || ''),
	name: input.name,
	slug: input.slug,
	unitType: (input as unknown as { unitType?: string }).unitType,
	defaultUnit: input.defaultUnit,
	displayOrder: (input as unknown as { displayOrder?: number }).displayOrder,
	isActive: Boolean((input as unknown as { isActive?: boolean }).isActive),
	deletedAt: (input as unknown as { deletedAt?: string }).deletedAt,
	createdAt: (input as unknown as { createdAt?: string }).createdAt,
	updatedAt: (input as unknown as { updatedAt?: string }).updatedAt,
});

const toApiPayload = (payload: Partial<IncludedItemEntity>) => ({
	name: payload.name,
	slug: payload.slug,
	unitType: payload.unitType,
	defaultUnit: payload.defaultUnit,
	displayOrder: payload.displayOrder,
	isActive: payload.isActive,
});

export const adminIncludedItemsService = {
	async list(params?: { page?: number; limit?: number; q?: string; isActive?: boolean }) {
		const query = new URLSearchParams();
		if (params?.page) query.set('page', String(params.page));
		if (params?.limit) query.set('limit', String(params.limit));
		if (params?.q) query.set('q', params.q);
		if (typeof params?.isActive === 'boolean') query.set('isActive', String(params.isActive));

		const result = await apiJson<PaginatedResponse<ApiIncludedItem>>(`/admin/included-items?${query.toString()}`);
		return { ...result, data: result.data.map(toIncludedItem) } satisfies PaginatedResponse<IncludedItemEntity>;
	},

	async create(payload: Partial<IncludedItemEntity>) {
		const result = await apiJson<SingleResponse<ApiIncludedItem>>('/admin/included-items', {
			method: 'POST',
			body: JSON.stringify(toApiPayload(payload)),
		});
		return { ...result, data: toIncludedItem(result.data) } satisfies SingleResponse<IncludedItemEntity>;
	},

	async update(id: string, payload: Partial<IncludedItemEntity>) {
		const result = await apiJson<SingleResponse<ApiIncludedItem>>(
			`/admin/included-items/${encodeURIComponent(id)}`,
			{
				method: 'PUT',
				body: JSON.stringify(toApiPayload(payload)),
			}
		);
		return { ...result, data: toIncludedItem(result.data) } satisfies SingleResponse<IncludedItemEntity>;
	},

	async softDelete(id: string) {
		const result = await apiJson<SingleResponse<ApiIncludedItem>>(
			`/admin/included-items/${encodeURIComponent(id)}`,
			{
				method: 'DELETE',
			}
		);
		return { ...result, data: toIncludedItem(result.data) } satisfies SingleResponse<IncludedItemEntity>;
	},
};
