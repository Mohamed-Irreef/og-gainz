import { apiJson, apiUpload } from './apiClient';
import type { Meal, PaginatedResponse, SingleResponse } from '@/types/catalog';

type AdminMeal = Meal & {
	isActive: boolean;
	deletedAt?: string;
	createdAt?: string;
	updatedAt?: string;
};

type ApiAdminMeal = Omit<AdminMeal, 'id'> & { _id?: string };

const toAdminMeal = (input: ApiAdminMeal): AdminMeal => {
	const images = (input as unknown as { images?: AdminMeal['images'] }).images;
	const normalizedImages = Array.isArray(images) ? images.filter(Boolean) : undefined;
	const primaryImage = normalizedImages?.[0] || input.image;
	return {
		id: String(input._id || (input as unknown as { id?: string }).id || ''),
		name: input.name,
		slug: input.slug,
		shortDescription:
			(input as unknown as { shortDescription?: string }).shortDescription ||
			(input as unknown as { description?: string }).description ||
			'',
		detailedDescription: (input as unknown as { detailedDescription?: string }).detailedDescription,
		// Backward compat (server may still send this alias)
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
		// Backward compat fields (server returns these derived from pricing.weekly)
		servings: (input as unknown as { servings?: number }).servings,
		price: (input as unknown as { price?: number }).price,
		tags: input.tags,
		isTrialEligible: input.isTrialEligible,
		isFeatured: input.isFeatured,
		isActive: input.isActive,
		deletedAt: input.deletedAt,
		createdAt: (input as unknown as { createdAt?: string }).createdAt,
		updatedAt: (input as unknown as { updatedAt?: string }).updatedAt,
	};
};

export const adminMealsService = {
	async get(id: string, options?: { signal?: AbortSignal }) {
		const result = await apiJson<SingleResponse<ApiAdminMeal>>(`/admin/meals/${encodeURIComponent(id)}`, { signal: options?.signal });
		return { ...result, data: toAdminMeal(result.data) } satisfies SingleResponse<AdminMeal>;
	},

	async list(params?: {
		page?: number;
		limit?: number;
		q?: string;
		isActive?: boolean;
		mealType?: Meal['mealType'];
		isFeatured?: boolean;
		isTrialEligible?: boolean;
	}) {
		const query = new URLSearchParams();
		if (params?.page) query.set('page', String(params.page));
		if (params?.limit) query.set('limit', String(params.limit));
		if (params?.q) query.set('q', params.q);
		if (typeof params?.isActive === 'boolean') query.set('isActive', String(params.isActive));
		if (params?.mealType) query.set('mealType', params.mealType);
		if (typeof params?.isFeatured === 'boolean') query.set('isFeatured', String(params.isFeatured));
		if (typeof params?.isTrialEligible === 'boolean') query.set('isTrialEligible', String(params.isTrialEligible));

		const result = await apiJson<PaginatedResponse<ApiAdminMeal>>(`/admin/meals?${query.toString()}`);
		return { ...result, data: result.data.map(toAdminMeal) } satisfies PaginatedResponse<AdminMeal>;
	},

	async create(payload: Partial<AdminMeal>) {
		const result = await apiJson<SingleResponse<ApiAdminMeal>>('/admin/meals', {
			method: 'POST',
			body: JSON.stringify(payload),
		});
		return { ...result, data: toAdminMeal(result.data) } satisfies SingleResponse<AdminMeal>;
	},

	async update(id: string, payload: Partial<AdminMeal>) {
		const result = await apiJson<SingleResponse<ApiAdminMeal>>(`/admin/meals/${encodeURIComponent(id)}`,
			{
				method: 'PUT',
				body: JSON.stringify(payload),
			}
		);
		return { ...result, data: toAdminMeal(result.data) } satisfies SingleResponse<AdminMeal>;
	},

	async softDelete(id: string) {
		const result = await apiJson<SingleResponse<ApiAdminMeal>>(`/admin/meals/${encodeURIComponent(id)}`,
			{
				method: 'DELETE',
			}
		);
		return { ...result, data: toAdminMeal(result.data) } satisfies SingleResponse<AdminMeal>;
	},

	async uploadImage(
		id: string,
		file: File,
		options?: { signal?: AbortSignal; onProgress?: (pct: number) => void; alt?: string }
	) {
		const form = new FormData();
		form.append('image', file);
		const alt = options?.alt;
		if (alt) form.append('alt', String(alt));
		const result = await apiUpload<SingleResponse<ApiAdminMeal>>(`/admin/meals/${encodeURIComponent(id)}/image`, form, {
			signal: options?.signal,
			onUploadProgress: options?.onProgress,
		});
		return { ...result, data: toAdminMeal(result.data) } satisfies SingleResponse<AdminMeal>;
	},

	async addImages(
		id: string,
		files: File[],
		options?: { signal?: AbortSignal; onProgress?: (pct: number) => void; alt?: string }
	) {
		const form = new FormData();
		for (const f of files) form.append('images', f);
		if (options?.alt) form.append('alt', String(options.alt));
		const result = await apiUpload<SingleResponse<ApiAdminMeal>>(`/admin/meals/${encodeURIComponent(id)}/images`, form, {
			signal: options?.signal,
			onUploadProgress: options?.onProgress,
		});
		return { ...result, data: toAdminMeal(result.data) } satisfies SingleResponse<AdminMeal>;
	},

	async replaceImageAtIndex(
		id: string,
		index: number,
		file: File,
		options?: { signal?: AbortSignal; onProgress?: (pct: number) => void; alt?: string }
	) {
		const form = new FormData();
		form.append('image', file);
		if (options?.alt) form.append('alt', String(options.alt));
		const result = await apiUpload<SingleResponse<ApiAdminMeal>>(
			`/admin/meals/${encodeURIComponent(id)}/images/${encodeURIComponent(String(index))}`,
			form,
			{
				method: 'PUT',
				signal: options?.signal,
				onUploadProgress: options?.onProgress,
			}
		);
		return { ...result, data: toAdminMeal(result.data) } satisfies SingleResponse<AdminMeal>;
	},

	async deleteImageAtIndex(id: string, index: number, options?: { signal?: AbortSignal }) {
		const result = await apiJson<SingleResponse<ApiAdminMeal>>(
			`/admin/meals/${encodeURIComponent(id)}/images/${encodeURIComponent(String(index))}`,
			{ method: 'DELETE', signal: options?.signal }
		);
		return { ...result, data: toAdminMeal(result.data) } satisfies SingleResponse<AdminMeal>;
	},

	async makePrimaryImage(id: string, index: number, options?: { signal?: AbortSignal }) {
		const result = await apiJson<SingleResponse<ApiAdminMeal>>(
			`/admin/meals/${encodeURIComponent(id)}/images/${encodeURIComponent(String(index))}/make-primary`,
			{ method: 'PATCH', signal: options?.signal }
		);
		return { ...result, data: toAdminMeal(result.data) } satisfies SingleResponse<AdminMeal>;
	},
};
