import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { API_BASE_URL } from '../config/env';

const TOKEN_STORAGE_KEY = 'oz-gainz-token';

const joinUrl = (base: string, path: string) => {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

type CacheEntry = { expiresAt: number; value: unknown };
const responseCache = new Map<string, CacheEntry>();

const getCacheKey = (url: string, config: AxiosRequestConfig) => {
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${String(config.method || 'get').toUpperCase()} ${url} ${params}`;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isIdempotentGet = (config: AxiosRequestConfig) => {
  return String(config.method || 'get').toLowerCase() === 'get';
};

const isRetryable = (err: unknown) => {
  const axiosErr = err as AxiosError | undefined;
  const status = axiosErr?.response?.status;
  // retry on network error / 5xx / 429
  return !status || status >= 500 || status === 429;
};

export const authTokenStorage = {
  key: TOKEN_STORAGE_KEY,
  get: () => localStorage.getItem(TOKEN_STORAGE_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_STORAGE_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_STORAGE_KEY),
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 12_000,
});

apiClient.interceptors.request.use((config) => {
  if (!API_BASE_URL && !config.baseURL) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }

  const token = authTokenStorage.get();
  config.headers = {
    ...(config.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return config;
});

const normalizeAxiosError = (err: unknown) => {
  if (!axios.isAxiosError(err)) return err;

  const data = err.response?.data as unknown;
  if (data && typeof data === 'object' && 'message' in data) {
    return new Error(String((data as { message?: unknown }).message));
  }
  if (err.message) return new Error(err.message);
  return new Error('Request failed');
};

type ApiOptions = {
  cacheTtlMs?: number;
  retries?: number;
};

const requestJson = async <T>(path: string, init?: RequestInit, options?: ApiOptions): Promise<T> => {
  const method = (init?.method || 'GET').toUpperCase();
  const url = API_BASE_URL ? joinUrl(API_BASE_URL, path) : path;

  const headers = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };

  // fetch-style body -> axios data
  let data: unknown = undefined;
  if (init?.body != null) {
    if (typeof init.body === 'string') {
      try {
        data = JSON.parse(init.body);
      } catch {
        data = init.body;
      }
    } else {
      data = init.body;
    }
  }

  const config: AxiosRequestConfig = {
    url,
    method,
    headers,
    data,
    signal: init?.signal,
  };

  const cacheTtlMs = options?.cacheTtlMs ?? 15_000;
  const retries = options?.retries ?? 2;
  const canCache = method === 'GET' && cacheTtlMs > 0;

  if (canCache) {
    const key = getCacheKey(url, config);
    const hit = responseCache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value as T;
    }
  }

  let attempt = 0;
  while (true) {
    try {
      const response: AxiosResponse<T> = await apiClient.request<T>(config);
      if (canCache) {
        const key = getCacheKey(url, config);
        responseCache.set(key, { expiresAt: Date.now() + cacheTtlMs, value: response.data });
      }
      return response.data;
    } catch (err) {
      attempt += 1;

      // respect AbortController cancellation
      if (axios.isCancel(err) || (err as { name?: string } | undefined)?.name === 'CanceledError') {
        throw err;
      }

      if (!isIdempotentGet(config) || attempt > retries || !isRetryable(err)) {
        throw normalizeAxiosError(err);
      }

      await sleep(250 * attempt);
    }
  }
};

export const apiJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  // Default caching/retry applies to GETs only.
  return requestJson<T>(path, init, { cacheTtlMs: 15_000, retries: 2 });
};

// Use for polling/order-state sync where cached GETs would hide updates.
export const apiJsonNoCache = async <T>(path: string, init?: RequestInit): Promise<T> => {
  return requestJson<T>(path, init, { cacheTtlMs: 0, retries: 2 });
};

export const apiUpload = async <T>(
	path: string,
	formData: FormData,
	options?: { signal?: AbortSignal; onUploadProgress?: (progressPct: number) => void; method?: 'POST' | 'PUT' | 'PATCH' }
) => {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }
  const url = joinUrl(API_BASE_URL, path);

  try {
    const response = await apiClient.request<T>({
      url,
			method: options?.method || 'POST',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options?.signal,
      onUploadProgress: (evt) => {
        if (!options?.onUploadProgress) return;
        const total = evt.total || 0;
        if (!total) return;
        options.onUploadProgress(Math.round((evt.loaded / total) * 100));
      },
    });

    return response.data;
  } catch (err) {
    throw normalizeAxiosError(err);
  }
};
