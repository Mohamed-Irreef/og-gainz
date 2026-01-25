import type { CartItem, CartItemInput, CartOrderDetails, CartPlan, CartState, DeliveryLocationInput } from '@/types/cartPhase4';

const STORAGE_KEY = 'oz-gainz-cart-v2';

const safeParse = <T,>(value: string | null): T | null => {
	if (!value) return null;
	try {
		return JSON.parse(value) as T;
	} catch {
		return null;
	}
};

const createId = () => `cart-item-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isSubscriptionPlan = (plan: unknown): boolean => plan === 'weekly' || plan === 'monthly';

const normalizeCartItemInput = (item: CartItemInput): CartItemInput => {
	if (!item || typeof item !== 'object') return item;
	if (isSubscriptionPlan((item as CartItemInput).plan)) {
		return { ...item, quantity: 1 };
	}
	return item;
};

const normalizeStoredState = (state: CartState): CartState => {
	if (!state || typeof state !== 'object') return { items: [], creditsToApply: 0, orderDetailsByItemId: {} };
	const items = Array.isArray(state.items) ? state.items : [];
	const normalizedItems = items.map((i) => {
		if (i && isSubscriptionPlan(i.plan)) return { ...i, quantity: 1 };
		return i;
	});

	return {
		items: normalizedItems,
		creditsToApply: typeof state.creditsToApply === 'number' ? state.creditsToApply : 0,
		deliveryLocation: state.deliveryLocation,
		orderDetailsByItemId: state.orderDetailsByItemId && typeof state.orderDetailsByItemId === 'object' ? state.orderDetailsByItemId : {},
	};
};

export const cartService = {
	getState(): CartState {
		const stored = safeParse<CartState>(localStorage.getItem(STORAGE_KEY));
		if (stored && Array.isArray(stored.items)) {
			const normalized = normalizeStoredState(stored);
			// Persist normalization (e.g., legacy subscription quantity values)
			this.saveState(normalized);
			return normalized;
		}

		return { items: [], creditsToApply: 0, orderDetailsByItemId: {} };
	},

	saveState(state: CartState): void {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	},

	addItem(item: CartItemInput & { id?: string }): CartState {
		const state = this.getState();
		const normalized = normalizeCartItemInput(item);
		state.items.push({ ...normalized, id: item.id || createId() } as CartItem);
		this.saveState(state);
		return state;
	},

	removeItem(itemId: string): CartState {
		const state = this.getState();
		state.items = state.items.filter((i) => i.id !== itemId);
		if (state.orderDetailsByItemId) delete state.orderDetailsByItemId[itemId];
		this.saveState(state);
		return state;
	},

	updateItemQuantity(itemId: string, quantity: number): CartState {
		const state = this.getState();
		const item = state.items.find((i) => i.id === itemId);
		if (item && isSubscriptionPlan(item.plan)) {
			item.quantity = 1;
		} else if (item && Number.isFinite(quantity) && quantity > 0) {
			item.quantity = Math.floor(quantity);
		}
		this.saveState(state);
		return state;
	},

	updateCreditsToApply(amount: number): CartState {
		const state = this.getState();
		state.creditsToApply = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
		this.saveState(state);
		return state;
	},

	setDeliveryLocation(location?: DeliveryLocationInput): CartState {
		const state = this.getState();
		state.deliveryLocation = location;
		this.saveState(state);
		return state;
	},

	setOrderDetails(itemId: string, details: CartOrderDetails): CartState {
		const state = this.getState();
		state.orderDetailsByItemId = state.orderDetailsByItemId || {};
		state.orderDetailsByItemId[itemId] = details;
		this.saveState(state);
		return state;
	},

	clearCart(): CartState {
		const empty: CartState = { items: [], creditsToApply: 0, orderDetailsByItemId: {} };
		this.saveState(empty);
		return empty;
	},

	getItemCount(): number {
		const state = this.getState();
		return state.items.length;
	},

	hasItems(): boolean {
		return this.getState().items.length > 0;
	},

	createMealItem(mealId: string, plan: CartPlan): CartItemInput {
		return { type: 'meal', mealId, plan, quantity: 1 };
	},
};
