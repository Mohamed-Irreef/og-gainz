export type CartItemType = 'meal' | 'addon' | 'byo';
export type CartPlan = 'single' | 'trial' | 'weekly' | 'monthly';

export type CartItemMeta = {
	// Informational only (does not affect pricing). Useful for showing subscription servings in UI.
	subscriptionServings?: number;
};

export type ByoSelection = {
	itemId: string;
	quantity: number;
};

export type CartItem =
	| {
			id: string;
			type: 'meal';
			plan: CartPlan;
			mealId: string;
			quantity: number;
			meta?: CartItemMeta;
	  }
	| {
			id: string;
			type: 'addon';
			plan: Exclude<CartPlan, 'trial'>;
			addonId: string;
			quantity: number;
			meta?: CartItemMeta;
	  }
	| {
			id: string;
			type: 'byo';
			plan: Exclude<CartPlan, 'trial'>;
			selections: ByoSelection[];
			byoSnapshot?: {
				plan: 'single' | 'weekly' | 'monthly';
				total: number;
				proteinGrams: number;
				calories: number;
				minimumRequired: number;
				meetsMinimum: boolean;
				lineItems: Array<{ itemId: string; quantity: number; unitPrice: number; lineTotal: number }>;
				ingredients: Array<{ itemId: string; name: string; quantity: number; unitPrice: number; lineTotal: number }>;
			};
			quantity: number;
			meta?: CartItemMeta;
	  };

export type CartItemInput =
	| {
			type: 'meal';
			plan: CartPlan;
			mealId: string;
			quantity: number;
			meta?: CartItemMeta;
	  }
	| {
			type: 'addon';
			plan: Exclude<CartPlan, 'trial'>;
			addonId: string;
			quantity: number;
			meta?: CartItemMeta;
	  }
	| {
			type: 'byo';
			plan: Exclude<CartPlan, 'trial'>;
			selections: ByoSelection[];
			byoSnapshot?: {
				plan: 'single' | 'weekly' | 'monthly';
				total: number;
				proteinGrams: number;
				calories: number;
				minimumRequired: number;
				meetsMinimum: boolean;
				lineItems: Array<{ itemId: string; quantity: number; unitPrice: number; lineTotal: number }>;
				ingredients: Array<{ itemId: string; name: string; quantity: number; unitPrice: number; lineTotal: number }>;
			};
			quantity: number;
			meta?: CartItemMeta;
	  };

export type DeliveryLocationInput = {
	latitude: number;
	longitude: number;
	address?: string;
};

export type CartOrderDetails = {
	startDate?: string; // YYYY-MM-DD
	deliveryTime?: string; // HH:mm
	immediateDelivery?: boolean;
};

export type CartState = {
	items: CartItem[];
	creditsToApply: number;
	deliveryLocation?: DeliveryLocationInput;
	orderDetailsByItemId?: Record<string, CartOrderDetails>;
};

export type CartQuoteItem = {
	cartItemId: string;
	type: CartItemType;
	plan: CartPlan;
	quantity: number;
	title: string;
	unitPrice: number;
	lineTotal: number;
	mealId?: string;
	addonId?: string;
	meta?: unknown;
};

export type CartQuote = {
	items: CartQuoteItem[];
	subtotal: number;
	deliveryFee: number;
	distanceKm?: number;
	isServiceable: boolean;
	creditsApplied: number;
	total: number;
	deliveryLocation?: DeliveryLocationInput;
	reason?: string;
};
