import { USE_MOCKS } from '@/config/env';
import { apiJson } from './apiClient';
import { customMealComponents } from '@/data/customMealComponents';
import type { CustomMealComponent } from '@/types/phase4';

export const customMealComponentsService = {
	async list(options?: { signal?: AbortSignal }) {
		if (USE_MOCKS) {
			return { status: 'success' as const, data: customMealComponents };
		}

		return apiJson<{ status: 'success' | 'error'; data: CustomMealComponent[] }>(
			'/commerce/custom-meal-components',
			{ signal: options?.signal }
		);
	},
};
