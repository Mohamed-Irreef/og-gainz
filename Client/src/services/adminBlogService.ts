import { apiJson, apiUpload } from '@/lib/apiClient';
import type { PaginatedResponse, SingleResponse } from '@/types/catalog';

// Define the Blog type
export type Blog = {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    content?: string;
    coverImage?: { url: string; publicId: string; alt?: string };
    bannerImage?: { url: string; publicId: string; alt?: string };
    authorName?: string;
    authorImage?: string;
    category?: string;
    tags?: string[];
    status: 'draft' | 'published';
    featured: boolean;
    readingTime?: number;
    publishedAt?: string;
    createdAt?: string;
    updatedAt?: string;
};

type ApiBlog = Omit<Blog, 'id'> & { _id?: string };

const toBlog = (input: ApiBlog): Blog => {
    return {
        ...input,
        id: String(input._id || (input as any).id || ''),
    };
};

export const adminBlogService = {
    async get(id: string, options?: { signal?: AbortSignal }) {
        const result = await apiJson<SingleResponse<ApiBlog>>(`/admin/blogs/${encodeURIComponent(id)}`, { signal: options?.signal });
        return { ...result, data: toBlog(result.data) } satisfies SingleResponse<Blog>;
    },

    async list(params?: {
        page?: number;
        limit?: number;
        q?: string;
        status?: 'draft' | 'published';
        featured?: boolean;
        category?: string;
    }) {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.q) query.set('q', params.q);
        if (params?.status) query.set('status', params.status);
        if (typeof params?.featured === 'boolean') query.set('featured', String(params.featured));
        if (params?.category) query.set('category', params.category);

        const result = await apiJson<PaginatedResponse<ApiBlog>>(`/admin/blogs?${query.toString()}`);
        return { ...result, data: result.data.map(toBlog) } satisfies PaginatedResponse<Blog>;
    },

    async create(payload: Partial<Blog>) {
        const result = await apiJson<SingleResponse<ApiBlog>>('/admin/blogs', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return { ...result, data: toBlog(result.data) } satisfies SingleResponse<Blog>;
    },

    async update(id: string, payload: Partial<Blog>) {
        const result = await apiJson<SingleResponse<ApiBlog>>(`/admin/blogs/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        return { ...result, data: toBlog(result.data) } satisfies SingleResponse<Blog>;
    },

    async remove(id: string) {
        const result = await apiJson<SingleResponse<ApiBlog>>(`/admin/blogs/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
        return { ...result, data: toBlog(result.data) } satisfies SingleResponse<Blog>;
    },

    async togglePublish(id: string) {
        const result = await apiJson<SingleResponse<ApiBlog>>(`/admin/blogs/${encodeURIComponent(id)}/publish`, {
            method: 'PATCH',
        });
        return { ...result, data: toBlog(result.data) } satisfies SingleResponse<Blog>;
    },

    async toggleFeatured(id: string) {
        const result = await apiJson<SingleResponse<ApiBlog>>(`/admin/blogs/${encodeURIComponent(id)}/featured`, {
            method: 'PATCH',
        });
        return { ...result, data: toBlog(result.data) } satisfies SingleResponse<Blog>;
    },

    async uploadCover(id: string, file: File, options?: { signal?: AbortSignal; onProgress?: (pct: number) => void; alt?: string }) {
        const form = new FormData();
        form.append('image', file);
        if (options?.alt) form.append('alt', String(options.alt));
        const result = await apiUpload<SingleResponse<ApiBlog>>(`/admin/blogs/${encodeURIComponent(id)}/cover`, form, {
            signal: options?.signal,
            onUploadProgress: options?.onProgress,
        });
        return { ...result, data: toBlog(result.data) } satisfies SingleResponse<Blog>;
    },

    async uploadBanner(id: string, file: File, options?: { signal?: AbortSignal; onProgress?: (pct: number) => void; alt?: string }) {
        const form = new FormData();
        form.append('image', file);
        if (options?.alt) form.append('alt', String(options.alt));
        const result = await apiUpload<SingleResponse<ApiBlog>>(`/admin/blogs/${encodeURIComponent(id)}/banner`, form, {
            signal: options?.signal,
            onUploadProgress: options?.onProgress,
        });
        return { ...result, data: toBlog(result.data) } satisfies SingleResponse<Blog>;
    },
};
