import { USE_MOCKS } from '@/config/env';
import { apiJson } from './apiClient';
import type { Addon, AddonCategory, PaginatedResponse } from '@/types/catalog';
import { addOns } from '@/data/addOns';

type ApiAddon = Omit<Addon, 'id'> & { _id?: string };

const toAddon = (input: ApiAddon): Addon => {
	return {
		id: String(input._id || (input as unknown as { id?: string }).id || ''),
		name: input.name,
		category: input.category,
		categoryId: (input as unknown as { categoryId?: string }).categoryId,
		categoryRef: (input as unknown as { categoryRef?: Addon['categoryRef'] }).categoryRef,
		description: (input as unknown as { description?: string }).description,
		image: input.image,
		images: (input as unknown as { images?: Addon['images'] }).images,
		pricing: (input as unknown as { pricing?: Addon['pricing'] }).pricing || { single: input.price ?? 0 },
		price: input.price,
		servings: (input as unknown as { servings?: Addon['servings'] }).servings,
		proteinGrams: input.proteinGrams,
		servingSizeText: (input as unknown as { servingSizeText?: string }).servingSizeText,
		displayOrder: (input as unknown as { displayOrder?: number }).displayOrder,
		isActive: input.isActive,
	};
};

const mapMockCategory = (category: string): AddonCategory => {
	// legacy mock categories: protein | sides | shakes | snacks
	if (category === 'protein') return 'protein';
	if (category === 'shakes') return 'shake';
	if (category === 'sides') return 'carbs';
	return 'custom';
};

const mockAddons: Addon[] = addOns.map((a) => ({
	id: a.id,
	name: a.name,
	category: mapMockCategory(a.category),
	pricing: {
		single: a.priceOneTime,
		weekly: a.priceSubscription || undefined,
	},
	price: a.priceOneTime,
	proteinGrams: a.proteinGrams,
	isActive: a.isAvailable,
}));

export const addonsCatalogService = {
	async listAddons(params?: { category?: AddonCategory; page?: number; limit?: number }, options?: { signal?: AbortSignal }) {
		if (USE_MOCKS) {
			const filtered = params?.category ? mockAddons.filter((a) => a.category === params.category) : mockAddons;
			return {
				status: 'success',
				data: filtered,
				meta: { page: 1, limit: filtered.length, total: filtered.length, hasNextPage: false },
			} satisfies PaginatedResponse<Addon>;
		}

		const query = new URLSearchParams();
		if (params?.category) query.set('category', params.category);
		if (params?.page) query.set('page', String(params.page));
		if (params?.limit) query.set('limit', String(params.limit));

		const result = await apiJson<PaginatedResponse<ApiAddon>>(`/addons?${query.toString()}`, { signal: options?.signal });
		return { ...result, data: result.data.map(toAddon) } satisfies PaginatedResponse<Addon>;
	},
};
