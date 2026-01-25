import { apiJson, apiUpload } from './apiClient';
import type { Addon, AddonCategory, PaginatedResponse, SingleResponse } from '@/types/catalog';

type AdminAddon = Addon & {
	isActive: boolean;
	deletedAt?: string;
	createdAt?: string;
	updatedAt?: string;
};

type ApiAdminAddon = Omit<AdminAddon, 'id'> & { _id?: string };

const toAdminAddon = (input: ApiAdminAddon): AdminAddon => {
	const rawPricing = (input as unknown as { pricing?: Addon['pricing'] }).pricing;
	const fallbackSingle =
		typeof (input as unknown as { price?: unknown }).price === 'number'
			? Number((input as unknown as { price?: number }).price)
			: 0;
	const pricing: Addon['pricing'] = {
		single: typeof rawPricing?.single === 'number' ? rawPricing.single : fallbackSingle,
		...(typeof (rawPricing as unknown as { weekly?: unknown })?.weekly === 'number' ? { weekly: (rawPricing as unknown as { weekly?: number }).weekly } : {}),
		...(typeof rawPricing?.monthly === 'number' ? { monthly: rawPricing.monthly } : {}),
	};
	const servingsRaw = (input as unknown as { servings?: unknown }).servings;
	const servings =
		servingsRaw && typeof servingsRaw === 'object'
			? {
				weekly: Number((servingsRaw as { weekly?: number }).weekly ?? 5),
				monthly: Number((servingsRaw as { monthly?: number }).monthly ?? 20),
			}
			: undefined;

	return {
		id: String(input._id || (input as unknown as { id?: string }).id || ''),
		name: input.name,
		category: input.category,
		categoryId: (input as unknown as { categoryId?: string }).categoryId,
		categoryRef: (input as unknown as { categoryRef?: AdminAddon['categoryRef'] }).categoryRef,
		description: (input as unknown as { description?: string }).description,
		image: input.image,
		images: (input as unknown as { images?: AdminAddon['images'] }).images,
		pricing,
		servings,
		// Backward compat: keep `price` as alias of pricing.single.
		price: typeof input.price === 'number' ? input.price : pricing.single,
		proteinGrams: input.proteinGrams,
		servingSizeText: (input as unknown as { servingSizeText?: string }).servingSizeText,
		displayOrder: (input as unknown as { displayOrder?: number }).displayOrder,
		isActive: input.isActive,
		deletedAt: input.deletedAt,
		createdAt: (input as unknown as { createdAt?: string }).createdAt,
		updatedAt: (input as unknown as { updatedAt?: string }).updatedAt,
	};
};

const toApiPayload = (payload: Partial<AdminAddon>) => {
	const rawPricing = (payload as unknown as { pricing?: Addon['pricing'] }).pricing;
	const rawPrice = (payload as unknown as { price?: unknown }).price;

	const pricing: Addon['pricing'] | undefined = rawPricing
		? {
			single: Number(rawPricing.single ?? 0),
			...(rawPricing.weekly != null ? { weekly: Number(rawPricing.weekly) } : {}),
			...(rawPricing.monthly != null ? { monthly: Number(rawPricing.monthly) } : {}),
		}
		: typeof rawPrice === 'number'
			? { single: Number(rawPrice) }
			: undefined;

	const servingsRaw = (payload as unknown as { servings?: unknown }).servings;
	const servings =
		servingsRaw && typeof servingsRaw === 'object'
			? {
				weekly: Number((servingsRaw as { weekly?: number }).weekly ?? 5),
				monthly: Number((servingsRaw as { monthly?: number }).monthly ?? 20),
			}
			: undefined;

	return {
		name: payload.name,
		category: payload.category,
		categoryId: (payload as unknown as { categoryId?: string }).categoryId,
		description: (payload as unknown as { description?: string }).description,
		pricing,
		servings,
		// Backward compat for older server versions
		price: pricing?.single ?? (typeof rawPrice === 'number' ? rawPrice : undefined),
		proteinGrams: payload.proteinGrams,
		servingSizeText: (payload as unknown as { servingSizeText?: string }).servingSizeText,
		displayOrder: (payload as unknown as { displayOrder?: number }).displayOrder,
		isActive: payload.isActive,
	};
};

export const adminAddonsService = {
	async get(id: string, options?: { signal?: AbortSignal }) {
		const result = await apiJson<SingleResponse<ApiAdminAddon>>(`/admin/addons/${encodeURIComponent(id)}`, { signal: options?.signal });
		return { ...result, data: toAdminAddon(result.data) } satisfies SingleResponse<AdminAddon>;
	},

	async list(params?: { page?: number; limit?: number; q?: string; category?: AddonCategory; isActive?: boolean }) {
		const query = new URLSearchParams();
		if (params?.page) query.set('page', String(params.page));
		if (params?.limit) query.set('limit', String(params.limit));
		if (params?.q) query.set('q', params.q);
		if (params?.category) query.set('category', params.category);
		if (typeof params?.isActive === 'boolean') query.set('isActive', String(params.isActive));

		const result = await apiJson<PaginatedResponse<ApiAdminAddon>>(`/admin/addons?${query.toString()}`);
		return { ...result, data: result.data.map(toAdminAddon) } satisfies PaginatedResponse<AdminAddon>;
	},

	async create(payload: Partial<AdminAddon>) {
		const result = await apiJson<SingleResponse<ApiAdminAddon>>('/admin/addons', {
			method: 'POST',
			body: JSON.stringify(toApiPayload(payload)),
		});
		return { ...result, data: toAdminAddon(result.data) } satisfies SingleResponse<AdminAddon>;
	},

	async update(id: string, payload: Partial<AdminAddon>) {
		const result = await apiJson<SingleResponse<ApiAdminAddon>>(`/admin/addons/${encodeURIComponent(id)}`,
			{
				method: 'PUT',
				body: JSON.stringify(toApiPayload(payload)),
			}
		);
		return { ...result, data: toAdminAddon(result.data) } satisfies SingleResponse<AdminAddon>;
	},

	async softDelete(id: string) {
		const result = await apiJson<SingleResponse<ApiAdminAddon>>(`/admin/addons/${encodeURIComponent(id)}`,
			{
				method: 'DELETE',
			}
		);
		return { ...result, data: toAdminAddon(result.data) } satisfies SingleResponse<AdminAddon>;
	},

	async hardDelete(id: string) {
		const result = await apiJson<SingleResponse<ApiAdminAddon>>(
			`/admin/addons/${encodeURIComponent(id)}?hard=true`,
			{
				method: 'DELETE',
			}
		);
		return { ...result, data: toAdminAddon(result.data) } satisfies SingleResponse<AdminAddon>;
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
		const result = await apiUpload<SingleResponse<ApiAdminAddon>>(`/admin/addons/${encodeURIComponent(id)}/image`, form, {
			signal: options?.signal,
			onUploadProgress: options?.onProgress,
		});
		return { ...result, data: toAdminAddon(result.data) } satisfies SingleResponse<AdminAddon>;
	},

	async addImages(
		id: string,
		files: File[],
		options?: { signal?: AbortSignal; onProgress?: (pct: number) => void; alt?: string }
	) {
		const form = new FormData();
		for (const file of files) form.append('images', file);
		const alt = options?.alt;
		if (alt) form.append('alt', String(alt));
		const result = await apiUpload<SingleResponse<ApiAdminAddon>>(`/admin/addons/${encodeURIComponent(id)}/images`, form, {
			signal: options?.signal,
			onUploadProgress: options?.onProgress,
		});
		return { ...result, data: toAdminAddon(result.data) } satisfies SingleResponse<AdminAddon>;
	},

	async deleteImageAtIndex(id: string, index: number) {
		const result = await apiJson<SingleResponse<ApiAdminAddon>>(`/admin/addons/${encodeURIComponent(id)}/images/${index}`,
			{
				method: 'DELETE',
			}
		);
		return { ...result, data: toAdminAddon(result.data) } satisfies SingleResponse<AdminAddon>;
	},

	async makeImagePrimary(id: string, index: number) {
		const result = await apiJson<SingleResponse<ApiAdminAddon>>(`/admin/addons/${encodeURIComponent(id)}/images/${index}/make-primary`,
			{
				method: 'PATCH',
			}
		);
		return { ...result, data: toAdminAddon(result.data) } satisfies SingleResponse<AdminAddon>;
	},
};
