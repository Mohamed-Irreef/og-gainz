import { USE_MOCKS } from '@/config/env';
import { apiJson } from './apiClient';
import type { Meal, PaginatedResponse, SingleResponse } from '@/types/catalog';
import { mealPacks } from '@/data/mealPacks';

type ApiMeal = Omit<Meal, 'id'> & { _id?: string };

const toMeal = (input: ApiMeal): Meal => {
	const images = (input as unknown as { images?: Meal['images'] }).images;
	const normalizedImages = Array.isArray(images) ? images.filter(Boolean) : undefined;
	const primaryImage = normalizedImages?.[0] || input.image;
	return {
		id: String(input._id || (input as unknown as { id?: string }).id || ''),
		name: input.name,
		slug: input.slug,
		shortDescription: input.shortDescription || (input as unknown as { description?: string }).description || '',
		detailedDescription: input.detailedDescription,
		description: (input as unknown as { description?: string }).description,
		image: primaryImage,
		images: normalizedImages,
		proteinPerMeal: input.proteinPerMeal,
		proteinPerMealWith: (input as unknown as { proteinPerMealWith?: number }).proteinPerMealWith,
		proteinPerMealWithout: (input as unknown as { proteinPerMealWithout?: number }).proteinPerMealWithout,
		caloriesRange: input.caloriesRange,
		mealTypeId: (input as unknown as { mealTypeId?: string }).mealTypeId,
		mealTypeRef: (input as unknown as { mealTypeRef?: Meal['mealTypeRef'] }).mealTypeRef,
		mealType:
			String(
				(input as unknown as { mealType?: unknown }).mealType ||
				(input as unknown as { mealTypeRef?: { slug?: unknown } }).mealTypeRef?.slug ||
				''
			) as Meal['mealType'],
		hasWithProteinOption: (input as unknown as { hasWithProteinOption?: boolean }).hasWithProteinOption,
		hasWithoutProteinOption: (input as unknown as { hasWithoutProteinOption?: boolean }).hasWithoutProteinOption,
		pricing: (input as unknown as { pricing?: Meal['pricing'] }).pricing || {
			monthly: { price: 0, servings: 20 },
			weekly: { price: 0, servings: 5 },
		},
		proteinPricingMode: (input as unknown as { proteinPricingMode?: Meal['proteinPricingMode'] }).proteinPricingMode,
		proteinPricing: (input as unknown as { proteinPricing?: Meal['proteinPricing'] }).proteinPricing,
		includedItems: (input as unknown as { includedItems?: Meal['includedItems'] }).includedItems,
		includedItemAssignments: (input as unknown as { includedItemAssignments?: Meal['includedItemAssignments'] }).includedItemAssignments,
		trialBadgeText: (input as unknown as { trialBadgeText?: string }).trialBadgeText,
		displayOrder: (input as unknown as { displayOrder?: number }).displayOrder,
		// Backward compat (server also provides these)
		servings: (input as unknown as { servings?: number }).servings,
		price: (input as unknown as { price?: number }).price,
		tags: input.tags,
		isTrialEligible: input.isTrialEligible,
		isFeatured: input.isFeatured,
	};
};

const mockMeals: Meal[] = mealPacks.map((p) => ({
	id: p.id,
	slug: p.id,
	name: p.name,
	shortDescription: p.description,
	detailedDescription: p.description,
	description: p.description,
	proteinPerMeal: p.proteinPerMeal,
	caloriesRange: p.shortDescription,
	mealType: (p.tier === 'elite' ? 'elite' : p.tier === 'royal' ? 'royal' : 'signature'),
	pricing: {
		weekly: { price: p.pricing.weekly, servings: 5 },
		monthly: { price: p.pricing.monthly, servings: 20 },
		trial: p.isTrialAvailable
			? {
				price: p.pricing.trial ? Math.min(...Object.values(p.pricing.trial)) : 0,
				servings: 1,
			}
			: undefined,
	},
	// Backward compat
	servings: 5,
	price: p.pricing.weekly,
	tags: [p.tier],
	isTrialEligible: p.isTrialAvailable,
	isFeatured: p.tier === 'elite',
}));

export const mealsCatalogService = {
	async listMeals(
		params?: { page?: number; limit?: number; trialEligible?: boolean; mealType?: Meal['mealType']; isFeatured?: boolean },
		options?: { signal?: AbortSignal }
	) {
		if (USE_MOCKS) {
			let data = mockMeals;
			if (typeof params?.trialEligible === 'boolean') {
				data = data.filter((m) => m.isTrialEligible === params.trialEligible);
			}
			if (params?.mealType) {
				data = data.filter((m) => m.mealType === params.mealType);
			}
			if (typeof params?.isFeatured === 'boolean') {
				data = data.filter((m) => m.isFeatured === params.isFeatured);
			}
			return {
				status: 'success',
				data,
				meta: { page: 1, limit: data.length, total: data.length, hasNextPage: false },
			} satisfies PaginatedResponse<Meal>;
		}

		const query = new URLSearchParams();
		if (params?.page) query.set('page', String(params.page));
		if (params?.limit) query.set('limit', String(params.limit));
		if (typeof params?.trialEligible === 'boolean') query.set('trialEligible', String(params.trialEligible));
		if (params?.mealType) query.set('mealType', params.mealType);
		if (typeof params?.isFeatured === 'boolean') query.set('isFeatured', String(params.isFeatured));

		const result = await apiJson<PaginatedResponse<ApiMeal>>(`/meals?${query.toString()}`, { signal: options?.signal });
		return {
			...result,
			data: result.data.map(toMeal),
		} satisfies PaginatedResponse<Meal>;
	},

	async getMealBySlug(slug: string, options?: { signal?: AbortSignal }) {
		if (USE_MOCKS) {
			const found = mockMeals.find((m) => m.slug === slug);
			if (!found) throw new Error('Meal not found');
			return { status: 'success', data: found } satisfies SingleResponse<Meal>;
		}

		const result = await apiJson<SingleResponse<ApiMeal>>(`/meals/${encodeURIComponent(slug)}`, { signal: options?.signal });
		return { ...result, data: toMeal(result.data) } satisfies SingleResponse<Meal>;
	},
};
