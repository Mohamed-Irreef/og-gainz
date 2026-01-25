import { apiJson } from './apiClient';
import type { BuildYourOwnConfig } from '@/types/buildYourOwn';

export const adminBuildYourOwnConfigService = {
	async get() {
		return apiJson<{ status: 'success' | 'error'; data: BuildYourOwnConfig }>(
			'/admin/byo-config'
		);
	},

	async update(payload: Partial<BuildYourOwnConfig>) {
		return apiJson<{ status: 'success' | 'error'; data: BuildYourOwnConfig }>(
			'/admin/byo-config',
			{ method: 'PUT', body: JSON.stringify(payload) }
		);
	},
};
