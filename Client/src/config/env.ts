type ViteEnv = {
  VITE_API_BASE_URL?: string;
  VITE_USE_MOCKS?: string;
  VITE_GOOGLE_CLIENT_ID?: string;
  VITE_SUPPORT_WHATSAPP_NUMBER?: string;
};

const viteEnv = import.meta.env as unknown as ViteEnv;

export const API_BASE_URL = viteEnv.VITE_API_BASE_URL;

export const GOOGLE_CLIENT_ID = viteEnv.VITE_GOOGLE_CLIENT_ID;

export const USE_MOCKS = (viteEnv.VITE_USE_MOCKS ?? 'true').toLowerCase() === 'true';

export const SUPPORT_WHATSAPP_NUMBER = viteEnv.VITE_SUPPORT_WHATSAPP_NUMBER;
