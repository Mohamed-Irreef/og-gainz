import { apiJsonNoCache } from './apiClient';

export type AdminSettings = {
  freeDeliveryRadius: number;
  extraChargePerKm: number;
  maxDeliveryRadius: number;
  signupBonusCredits: number;
  deliveryCutoffMinutes: number;
  walletRefundPolicy: string;
};

type ApiEnvelope<T> = { status: 'success' | 'error'; data: T; message?: string };

type AdminSettingsResponse = AdminSettings & { id: string };

export const adminSettingsService = {
  async getSettings(options?: { signal?: AbortSignal }) {
    const res = await apiJsonNoCache<ApiEnvelope<AdminSettingsResponse>>('/admin/settings', { signal: options?.signal });
    if (res.status !== 'success') throw new Error(res.message || 'Failed to load settings');
    return res.data;
  },

  async updateSettings(input: AdminSettings, options?: { signal?: AbortSignal }) {
    const res = await apiJsonNoCache<ApiEnvelope<AdminSettingsResponse>>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(input),
      signal: options?.signal,
    });
    if (res.status !== 'success') throw new Error(res.message || 'Failed to update settings');
    return res.data;
  },
};
