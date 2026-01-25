export type Frequency = 'weekly' | 'monthly' | 'trial';

export type CustomMealCategory = 'protein' | 'carbs' | 'sides';

export type CustomMealComponent = {
	id: string;
	name: string;
	category: CustomMealCategory;
	proteinGramsPerServing: number;
	pricePerServing: number;
	caloriesPerServing?: number;
	imageUrl?: string;
};

export type CustomMealSelection = {
	componentId: string;
	quantity: number;
};

export type CustomMealTotals = {
	proteinGrams: number;
	calories?: number;
	pricePerServing: number;
	weeklyPrice: number;
	monthlyPrice: number;
};

export type CustomMealSubscriptionStatus = 'active' | 'paused';

export type CustomMealSubscription = {
	id: string;
	userId: string;
	frequency: Frequency;
	selections: CustomMealSelection[];
	totals: CustomMealTotals;
	status: CustomMealSubscriptionStatus;
	startDate: string;
	createdAt: string;
};

export type AddonSubscriptionStatus = 'active' | 'paused';

export type AddonSubscription = {
	id: string;
	userId: string;
	addonId: string;
	frequency: Frequency;
	servings: number;
	price: number;
	status: AddonSubscriptionStatus;
	startDate: string;
	createdAt: string;
};

export type AddonPurchaseStatus = 'pending' | 'confirmed' | 'cancelled';

export type AddonPurchase = {
	id: string;
	userId: string;
	addonId: string;
	quantity: number;
	price: number;
	status: AddonPurchaseStatus;
	createdAt: string;
};
