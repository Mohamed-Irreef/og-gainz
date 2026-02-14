import type { User, Address } from '@/types';
import { getUserById as getUser } from '@/data/users';
import { apiJson, authTokenStorage } from './apiClient';

type AuthUserPayload = {
  id: string;
  email: string;
  name?: string;
  role?: 'user' | 'admin';
  avatar?: string;
  provider?: 'email' | 'google';
  createdAt?: string;
  updatedAt?: string;
};

const normalizeAuthUser = (authUser: AuthUserPayload): User => {
  const existing = (() => {
    try {
      const stored = localStorage.getItem('oz-gainz-user');
      return stored ? (JSON.parse(stored) as Partial<User>) : null;
    } catch {
      return null;
    }
  })();

  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.name || existing?.name || '',
    phone: existing?.phone || '',
    avatar: authUser.avatar || existing?.avatar,
    role: authUser.role,
    addresses: existing?.addresses || [],
    walletBalance: existing?.walletBalance ?? 0,
    isVerified: existing?.isVerified ?? true,
    createdAt: authUser.createdAt || existing?.createdAt || new Date().toISOString(),
  };
};

type MePayload = {
  id: string;
  email: string;
  name?: string;
  role?: 'user' | 'admin';
  avatar?: string;
  provider?: 'email' | 'google';
  walletBalance?: number;
  addresses?: Address[];
  createdAt?: string;
  updatedAt?: string;
};

const normalizeMeUser = (me: MePayload): User => {
  const existing = (() => {
    try {
      const stored = localStorage.getItem('oz-gainz-user');
      return stored ? (JSON.parse(stored) as Partial<User>) : null;
    } catch {
      return null;
    }
  })();

  return {
    id: me.id,
    email: me.email,
    name: me.name || existing?.name || '',
    phone: existing?.phone || '',
    avatar: me.avatar || existing?.avatar,
    role: me.role,
    addresses: Array.isArray(me.addresses) ? me.addresses : existing?.addresses || [],
    walletBalance: typeof me.walletBalance === 'number' ? me.walletBalance : existing?.walletBalance ?? 0,
    isVerified: true,
    createdAt: me.createdAt || existing?.createdAt || new Date().toISOString(),
  };
};

// Mock authenticated user
let currentUser: User | null = null;

// Simulate API delay (legacy UI expects a tiny pause)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const userService = {
  // Phase 2: real auth (JWT) via backend
  async loginWithEmail(email: string, name?: string): Promise<User> {
    await delay(100);

    type LoginResponse = {
      status: 'success' | 'error';
      token: string;
      user: AuthUserPayload;
    };

    const result = await apiJson<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });

    authTokenStorage.set(result.token);

    try {
      const me = await this.getMe();
      return me;
    } catch {
      const normalized = normalizeAuthUser(result.user);
      currentUser = normalized;
      localStorage.setItem('oz-gainz-user', JSON.stringify(normalized));
      return normalized;
    }
  },

  // Phase 2B: Google OAuth (Google token used ONLY to exchange for OG GAINZ JWT)
  async loginWithGoogle(idToken: string): Promise<User> {
    await delay(100);

    type GoogleLoginResponse = {
      status: 'success' | 'error';
      token: string;
      user: AuthUserPayload;
    };

    const result = await apiJson<GoogleLoginResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });

    authTokenStorage.set(result.token);
    try {
      const me = await this.getMe();
      return me;
    } catch {
      const normalized = normalizeAuthUser(result.user);
      currentUser = normalized;
      localStorage.setItem('oz-gainz-user', JSON.stringify(normalized));
      return normalized;
    }
  },

  // Phase 2B: Google OAuth (access-token flow for custom UI)
  async loginWithGoogleAccessToken(accessToken: string): Promise<User> {
    await delay(100);

    type GoogleLoginResponse = {
      status: 'success' | 'error';
      token: string;
      user: AuthUserPayload;
    };

    const result = await apiJson<GoogleLoginResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    });

    authTokenStorage.set(result.token);
    try {
      const me = await this.getMe();
      return me;
    } catch {
      const normalized = normalizeAuthUser(result.user);
      currentUser = normalized;
      localStorage.setItem('oz-gainz-user', JSON.stringify(normalized));
      return normalized;
    }
  },

  async verify(): Promise<User> {
    await delay(75);

    type VerifyResponse = {
      status: 'success' | 'error';
      user: AuthUserPayload;
    };

    const result = await apiJson<VerifyResponse>('/auth/verify');

    try {
      const me = await this.getMe();
      return me;
    } catch {
      const normalized = normalizeAuthUser(result.user);
      currentUser = normalized;
      localStorage.setItem('oz-gainz-user', JSON.stringify(normalized));
      return normalized;
    }
  },

  // Server-truth profile (Phase 4)
  async getMe(): Promise<User> {
    type MeResponse = {
      status: 'success' | 'error';
      data: MePayload;
      message?: string;
    };

    const result = await apiJson<MeResponse>('/users/me');
    if (result.status !== 'success') throw new Error(result.message || 'Failed to load profile');
    const normalized = normalizeMeUser(result.data);
    currentUser = normalized;
    localStorage.setItem('oz-gainz-user', JSON.stringify(normalized));
    return normalized;
  },

  // Logout
  async logout(): Promise<void> {
    await delay(100);
    currentUser = null;
    authTokenStorage.clear();
    localStorage.removeItem('oz-gainz-user');
  },

  // Get current user from storage
  getCurrentUser(): User | null {
    if (currentUser) return currentUser;
    
    try {
      const stored = localStorage.getItem('oz-gainz-user');
      if (stored) {
        currentUser = JSON.parse(stored);
        return currentUser;
      }
    } catch {
      // Ignore parse errors
    }
    
    return null;
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!authTokenStorage.get() && this.getCurrentUser() !== null;
  },

  // Get user by ID
  async getUserById(id: string): Promise<User | null> {
    await delay(50);
    return getUser(id) || null;
  },

  // Update user profile
  async updateProfile(userId: string, data: Partial<User>): Promise<User | null> {
    await delay(75);

    // If we're authenticated, prefer server-truth updates.
    if (this.isAuthenticated()) {
      type UpdateMeResponse = {
        status: 'success' | 'error';
        data: MePayload;
        message?: string;
      };

      const patch: Record<string, unknown> = {};
      if (typeof data.name === 'string') patch.name = data.name;
      if (typeof data.avatar === 'string') patch.avatar = data.avatar;
      if (Array.isArray(data.addresses)) patch.addresses = data.addresses;

      const result = await apiJson<UpdateMeResponse>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (result.status !== 'success') throw new Error(result.message || 'Failed to update profile');

      const normalized = normalizeMeUser(result.data);
      // Keep client-only phone field for now (server model doesn't include it).
      if (typeof data.phone === 'string') normalized.phone = data.phone;
      currentUser = normalized;
      localStorage.setItem('oz-gainz-user', JSON.stringify(normalized));
      return normalized;
    }

    // Fallback: local-only update (offline/mocks)
    const user = this.getCurrentUser();
    if (user && user.id === userId) {
      const updated = { ...user, ...data };
      currentUser = updated;
      localStorage.setItem('oz-gainz-user', JSON.stringify(updated));
      return updated;
    }
    return null;
  },

  // Add address
  async addAddress(userId: string, address: Omit<Address, 'id'>): Promise<Address> {
		await delay(75);
		const user = this.getCurrentUser();
		const newAddress: Address = { ...address, id: `addr-${Date.now()}` };
		if (user && user.id === userId) {
			const next = [...(user.addresses || [])];
			if (newAddress.isDefault) next.forEach((a) => (a.isDefault = false));
			next.push(newAddress);
			await this.updateProfile(userId, { addresses: next });
		}
		return newAddress;
  },

  // Update address
  async updateAddress(userId: string, addressId: string, data: Partial<Address>): Promise<Address | null> {
		await delay(75);
		const user = this.getCurrentUser();
		if (user && user.id === userId) {
			const next = (user.addresses || []).map((a) => {
				if (a.id !== addressId) return a;
				return { ...a, ...data };
			});
			await this.updateProfile(userId, { addresses: next });
			return next.find((a) => a.id === addressId) || null;
		}
		return null;
  },

  // Delete address
  async deleteAddress(userId: string, addressId: string): Promise<boolean> {
		await delay(75);
		const user = this.getCurrentUser();
		if (user && user.id === userId) {
			const next = (user.addresses || []).filter((a) => a.id !== addressId);
			await this.updateProfile(userId, { addresses: next });
			return true;
		}
		return false;
  },

  // Get default address
  getDefaultAddress(): Address | null {
    const user = this.getCurrentUser();
    if (user) {
      return user.addresses.find((a: Address) => a.isDefault) || user.addresses[0] || null;
    }
    return null;
  },
};
