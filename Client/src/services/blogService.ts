import { apiJson } from '@/lib/apiClient';
import type { PaginatedResponse, SingleResponse } from '@/types/catalog';
import type { Blog } from './adminBlogService';

type ApiBlog = Omit<Blog, 'id'> & { _id?: string };

const toBlog = (input: ApiBlog): Blog => {
    return {
        ...input,
        id: String(input._id || (input as any).id || ''),
    };
};

export const blogService = {
    async list(params?: {
        page?: number;
        limit?: number;
        category?: string;
        featured?: boolean;
    }) {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.category) query.set('category', params.category);
        if (typeof params?.featured === 'boolean') query.set('featured', String(params.featured));

        const result = await apiJson<PaginatedResponse<ApiBlog>>(`/blogs?${query.toString()}`);
        return { ...result, data: result.data.map(toBlog) } satisfies PaginatedResponse<Blog>;
    },

    async getBySlug(slug: string, options?: { signal?: AbortSignal }) {
        const result = await apiJson<SingleResponse<ApiBlog>>(`/blogs/${encodeURIComponent(slug)}`, { signal: options?.signal });
        return { ...result, data: toBlog(result.data) } satisfies SingleResponse<Blog>;
    },

    async getRelated(slug: string, options?: { signal?: AbortSignal }) {
        const result = await apiJson<SingleResponse<ApiBlog[]>>(`/blogs/${encodeURIComponent(slug)}/related`, { signal: options?.signal });
        return { ...result, data: result.data.map(toBlog) } satisfies SingleResponse<Blog[]>;
    },
};
