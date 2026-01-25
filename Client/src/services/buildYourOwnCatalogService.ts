import { apiJson } from './apiClient';
import type {
	BuildYourOwnConfig,
	BuildYourOwnItemEntity,
	BuildYourOwnItemTypeEntity,
	BuildYourOwnPurchaseMode,
	BuildYourOwnQuote,
} from '@/types/buildYourOwn';

export const buildYourOwnCatalogService = {
	async listItemTypes(options?: { signal?: AbortSignal }) {
		return apiJson<{ status: 'success' | 'error'; data: BuildYourOwnItemTypeEntity[] }>(
			'/commerce/build-your-own/item-types',
			{ signal: options?.signal }
		);
	},

	async listItems(options?: { signal?: AbortSignal }) {
		return apiJson<{ status: 'success' | 'error'; data: BuildYourOwnItemEntity[] }>(
			'/commerce/build-your-own/items',
			{ signal: options?.signal }
		);
	},

	async getConfig(options?: { signal?: AbortSignal }) {
		return apiJson<{ status: 'success' | 'error'; data: BuildYourOwnConfig }>(
			'/commerce/build-your-own/config',
			{ signal: options?.signal }
		);
	},

	async quote(input: { mode: BuildYourOwnPurchaseMode; selections: Array<{ itemId: string; quantity: number }> }, options?: { signal?: AbortSignal }) {
		return apiJson<{ status: 'success' | 'error'; data: BuildYourOwnQuote }>(
			'/commerce/build-your-own/quote',
			{ method: 'POST', body: JSON.stringify(input), signal: options?.signal }
		);
	},

	async createSubscription(input: { mode: 'weekly' | 'monthly'; startDate: string; selections: Array<{ itemId: string; quantity: number }> }) {
		return apiJson<{ status: 'success' | 'error'; data: any }>(
			'/commerce/build-your-own/subscriptions',
			{ method: 'POST', body: JSON.stringify(input) }
		);
	},

	async createPurchase(input: { mode: 'single'; selections: Array<{ itemId: string; quantity: number }> }) {
		return apiJson<{ status: 'success' | 'error'; data: any }>(
			'/commerce/build-your-own/purchases',
			{ method: 'POST', body: JSON.stringify(input) }
		);
	},
};
