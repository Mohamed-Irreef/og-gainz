import type { CustomMealComponent } from '@/types/phase4';

// Phase 4: canonical client-side catalog for Build-Your-Own ingredients (used when USE_MOCKS=true).
// Server should validate against its own canonical pricing list.
export const customMealComponents: CustomMealComponent[] = [
	// Protein
	{
		id: 'chicken-breast',
		name: 'Chicken Breast',
		category: 'protein',
		proteinGramsPerServing: 23,
		pricePerServing: 149,
		caloriesPerServing: 165,
	},
	{
		id: 'tandoori-chicken',
		name: 'Tandoori Chicken',
		category: 'protein',
		proteinGramsPerServing: 22,
		pricePerServing: 169,
		caloriesPerServing: 190,
	},
	{
		id: 'grilled-fish',
		name: 'Grilled Fish Fillet',
		category: 'protein',
		proteinGramsPerServing: 24,
		pricePerServing: 199,
		caloriesPerServing: 180,
	},
	{
		id: 'paneer',
		name: 'Paneer',
		category: 'protein',
		proteinGramsPerServing: 16,
		pricePerServing: 129,
		caloriesPerServing: 265,
	},
	{
		id: 'egg-whites',
		name: 'Egg Whites',
		category: 'protein',
		proteinGramsPerServing: 12,
		pricePerServing: 99,
		caloriesPerServing: 70,
	},

	// Carbs
	{
		id: 'brown-rice',
		name: 'Brown Rice',
		category: 'carbs',
		proteinGramsPerServing: 3,
		pricePerServing: 49,
		caloriesPerServing: 210,
	},
	{
		id: 'quinoa',
		name: 'Quinoa',
		category: 'carbs',
		proteinGramsPerServing: 4,
		pricePerServing: 89,
		caloriesPerServing: 222,
	},
	{
		id: 'sweet-potato',
		name: 'Sweet Potato',
		category: 'carbs',
		proteinGramsPerServing: 2,
		pricePerServing: 69,
		caloriesPerServing: 180,
	},
	{
		id: 'chapati',
		name: 'Chapati (2 pcs)',
		category: 'carbs',
		proteinGramsPerServing: 4,
		pricePerServing: 39,
		caloriesPerServing: 210,
	},

	// Sides (Veggies / Salad / Extras)
	{
		id: 'veggies-mix',
		name: 'Veggies Mix',
		category: 'sides',
		proteinGramsPerServing: 2,
		pricePerServing: 49,
		caloriesPerServing: 80,
	},
	{
		id: 'salad',
		name: 'Fresh Salad',
		category: 'sides',
		proteinGramsPerServing: 1,
		pricePerServing: 59,
		caloriesPerServing: 45,
	},
	{
		id: 'yogurt',
		name: 'Yogurt',
		category: 'sides',
		proteinGramsPerServing: 4,
		pricePerServing: 49,
		caloriesPerServing: 80,
	},
	{
		id: 'nuts',
		name: 'Nuts / Dry Fruits',
		category: 'sides',
		proteinGramsPerServing: 6,
		pricePerServing: 79,
		caloriesPerServing: 160,
	},
];
