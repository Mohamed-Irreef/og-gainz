import { apiJson } from './apiClient';
import type { PaginatedResponse, SingleResponse, MealTypeEntity } from '@/types/catalog';

type ApiMealType = Omit<MealTypeEntity, 'id'> & { _id?: string };

const toMealType = (input: ApiMealType): MealTypeEntity => ({
	id: String(input._id || (input as unknown as { id?: string }).id || ''),
	name: input.name,
	slug: input.slug,
	description: (input as unknown as { description?: string }).description,
	displayOrder: (input as unknown as { displayOrder?: number }).displayOrder,
	isActive: Boolean((input as unknown as { isActive?: boolean }).isActive),
	deletedAt: (input as unknown as { deletedAt?: string }).deletedAt,
	createdAt: (input as unknown as { createdAt?: string }).createdAt,
	updatedAt: (input as unknown as { updatedAt?: string }).updatedAt,
});

const toApiPayload = (payload: Partial<MealTypeEntity>) => ({
	name: payload.name,
	slug: payload.slug,
	description: payload.description,
	displayOrder: payload.displayOrder,
	isActive: payload.isActive,
});

export const adminMealTypesService = {
	async list(params?: { page?: number; limit?: number; q?: string; isActive?: boolean }) {
		const query = new URLSearchParams();
		if (params?.page) query.set('page', String(params.page));
		if (params?.limit) query.set('limit', String(params.limit));
		if (params?.q) query.set('q', params.q);
		if (typeof params?.isActive === 'boolean') query.set('isActive', String(params.isActive));

		const result = await apiJson<PaginatedResponse<ApiMealType>>(`/admin/meal-types?${query.toString()}`);
		return { ...result, data: result.data.map(toMealType) } satisfies PaginatedResponse<MealTypeEntity>;
	},

	async create(payload: Partial<MealTypeEntity>) {
		const result = await apiJson<SingleResponse<ApiMealType>>('/admin/meal-types', {
			method: 'POST',
			body: JSON.stringify(toApiPayload(payload)),
		});
		return { ...result, data: toMealType(result.data) } satisfies SingleResponse<MealTypeEntity>;
	},

	async update(id: string, payload: Partial<MealTypeEntity>) {
		const result = await apiJson<SingleResponse<ApiMealType>>(`/admin/meal-types/${encodeURIComponent(id)}`,
			{
				method: 'PUT',
				body: JSON.stringify(toApiPayload(payload)),
			}
		);
		return { ...result, data: toMealType(result.data) } satisfies SingleResponse<MealTypeEntity>;
	},

	async softDelete(id: string) {
		const result = await apiJson<SingleResponse<ApiMealType>>(`/admin/meal-types/${encodeURIComponent(id)}`,
			{
				method: 'DELETE',
			}
		);
		return { ...result, data: toMealType(result.data) } satisfies SingleResponse<MealTypeEntity>;
	},
};
