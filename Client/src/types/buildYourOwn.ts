export type BuildYourOwnPurchaseMode = 'single' | 'weekly' | 'monthly';

export type BuildYourOwnQuantityUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs';

export type BuildYourOwnItemTypeEntity = {
	id: string;
	name: string;
	slug: string;
	displayOrder: number;
	isActive?: boolean;
	deletedAt?: string | null;
	createdAt?: string;
	updatedAt?: string;
};

export type BuildYourOwnItemEntity = {
	id: string;
	name: string;
	itemTypeId: string;
	itemTypeRef?: {
		id: string;
		name: string;
		slug: string;
		displayOrder: number;
		isActive?: boolean;
	} | null;
	quantityValue: number;
	quantityUnit: BuildYourOwnQuantityUnit;
	proteinGrams?: number;
	calories?: number;
	pricing: {
		single: number;
		weekly: number;
		monthly: number;
	};
	servings: {
		weekly: number;
		monthly: number;
	};
	image?: { url: string; publicId: string; alt?: string };
	displayOrder?: number;
	isActive?: boolean;
	deletedAt?: string | null;
	createdAt?: string;
	updatedAt?: string;
};

export type BuildYourOwnConfig = {
	id: string;
	minimumWeeklyOrderAmount: number;
	minimumMonthlyOrderAmount: number;
	maximumWeeklyOrderAmount?: number;
	maximumMonthlyOrderAmount?: number;
};

export type BuildYourOwnQuote = {
	mode: BuildYourOwnPurchaseMode;
	total: number;
	proteinGrams: number;
	calories: number;
	minimumRequired: number;
	meetsMinimum: boolean;
	lineItems: Array<{ itemId: string; quantity: number; unitPrice: number; lineTotal: number }>;
};
