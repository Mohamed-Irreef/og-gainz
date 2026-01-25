export type MealImage = {
	url: string;
	publicId: string;
	alt?: string;
};

// Backend-managed meal type slug (no longer hardcoded in the frontend)
export type MealType = string;

export type MealTypeEntity = {
	id: string;
	name: string;
	slug: string;
	description?: string;
	displayOrder?: number;
	isActive: boolean;
	deletedAt?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type IncludedItemUnit = 'g' | 'kg' | 'ml' | 'l' | 'pieces' | 'pcs';

export type IncludedItemEntity = {
	id: string;
	name: string;
	slug: string;
	unitType?: string;
	defaultUnit: IncludedItemUnit;
	displayOrder?: number;
	isActive: boolean;
	deletedAt?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type MealPricingTier = {
	price: number;
	servings: number;
};

export type MealPricing = {
	monthly: MealPricingTier;
	weekly: MealPricingTier;
	trial?: MealPricingTier;
};

export type ProteinPricingMode = 'default' | 'with-only' | 'without-only' | 'both';

export type ProteinPricing = {
	withProtein?: MealPricing;
	withoutProtein?: MealPricing;
};

export type IncludedItemVisibility = 'both' | 'with-protein' | 'without-protein';

export type MealIncludedItemAssignment = {
	itemId: string;
	item?: {
		id: string;
		name: string;
		slug: string;
		defaultUnit?: IncludedItemUnit;
		unitType?: string;
		displayOrder?: number;
		isActive?: boolean;
	};
	quantity: number;
	unit: IncludedItemUnit;
	visibility: IncludedItemVisibility;
	displayOrder?: number;
	isActive?: boolean;
};

export type MealIncludedItems = {
	rice?: boolean;
	chapati?: boolean;
	sweetPotato?: boolean;
	egg?: boolean;
	veggies?: boolean;
	chicken?: boolean;
	paneer?: boolean;
	yogurt?: boolean;
	proteinCurd?: boolean;
	fruitSalad?: boolean;
	boiledLegumesSprouts?: boolean;
	nutsDryFruits?: boolean;
};

export type Meal = {
	id: string;
	name: string;
	slug: string;
	// Phase 3: shortDescription is used on cards; detailedDescription is optional rich text.
	shortDescription: string;
	detailedDescription?: string;
	// Backward compat (older pages): server provides this as alias.
	description?: string;
	image?: MealImage;
	images?: MealImage[];
	proteinPerMeal: number;
	proteinPerMealWith?: number;
	proteinPerMealWithout?: number;
	// Admin-managed: total quantity of the meal pack (optional)
	totalQuantity?: number;
	totalQuantityUnit?: IncludedItemUnit;
	caloriesRange?: string;
	mealTypeId?: string;
	mealTypeRef?: {
		id: string;
		name: string;
		slug: string;
		isActive?: boolean;
		displayOrder?: number;
	};
	mealType: MealType;
	hasWithProteinOption?: boolean;
	hasWithoutProteinOption?: boolean;
	pricing: MealPricing;
	proteinPricingMode?: ProteinPricingMode;
	proteinPricing?: ProteinPricing;
	includedItems?: MealIncludedItems;
	includedItemAssignments?: MealIncludedItemAssignment[];
	trialBadgeText?: string;
	displayOrder?: number;
	// Backward compat (older pages): server provides these derived from pricing.weekly.
	servings?: number;
	price?: number;
	tags?: string[];
	isTrialEligible: boolean;
	isFeatured: boolean;
};

// Backend-managed add-on category slug (no longer hardcoded in the frontend)
export type AddonCategory = string;

export type AddonCategoryEntity = {
	id: string;
	name: string;
	slug: string;
	description?: string;
	displayOrder?: number;
	isActive: boolean;
	deletedAt?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type AddonImage = {
	url: string;
	publicId: string;
	alt?: string;
};

export type AddonPricing = {
	single: number;
	weekly?: number;
	monthly?: number;
};

export type AddonServings = {
	weekly: number;
	monthly: number;
};

export type Addon = {
	id: string;
	name: string;
	category: AddonCategory;
	categoryId?: string;
	categoryRef?: {
		id: string;
		name: string;
		slug: string;
		isActive?: boolean;
		displayOrder?: number;
	};
	description?: string;
	image?: AddonImage;
	images?: AddonImage[];
	pricing: AddonPricing;
	servings?: AddonServings;
	// Backward compat: server includes `price` alias of pricing.single.
	price?: number;
	proteinGrams?: number;
	servingSizeText?: string;
	displayOrder?: number;
	isActive?: boolean;
};

export type PaginatedResponse<T> = {
	status: 'success' | 'error';
	data: T[];
	meta: {
		page: number;
		limit: number;
		total: number;
		hasNextPage: boolean;
	};
};

export type SingleResponse<T> = {
	status: 'success' | 'error';
	data: T;
};
