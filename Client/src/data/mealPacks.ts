import type { MealPack } from '@/types';

export const mealPacks: MealPack[] = [
  {
    id: 'signature-pack',
    name: 'Signature Pack',
    tier: 'signature',
    proteinPerMeal: 35,
    description: 'Our foundational pack designed for fitness enthusiasts who want consistent, high-quality nutrition. Perfect for maintaining muscle mass and supporting an active lifestyle.',
    shortDescription: 'High-quality nutrition for fitness enthusiasts',
    targetUser: 'Fitness Enthusiasts & Active Individuals',
    items: [
      { name: 'Grilled Chicken Breast', description: 'Herb-marinated, perfectly grilled', proteinGrams: 30 },
      { name: 'Brown Rice', description: 'Fluffy, fiber-rich whole grain', proteinGrams: 3 },
      { name: 'Steamed Vegetables', description: 'Seasonal mix with olive oil', proteinGrams: 2 },
    ],
    pricing: {
      trial: { 3: 899, 5: 1399, 7: 1799 },
      weekly: 2499,
      monthly: 8999,
    },
    customizationRules: [
      { category: 'protein', maxSelections: 1, options: ['Chicken', 'Fish', 'Paneer', 'Tofu'] },
      { category: 'carbs', maxSelections: 1, options: ['Brown Rice', 'Quinoa', 'Sweet Potato'] },
    ],
    addOnEligible: true,
    isTrialAvailable: true,
    image: '/placeholder.svg',
  },
  {
    id: 'elite-pack',
    name: 'Elite Pack',
    tier: 'elite',
    proteinPerMeal: 40,
    description: 'Elevated nutrition for serious athletes and those with higher protein requirements. Features premium ingredients and enhanced macro distribution.',
    shortDescription: 'Premium nutrition for serious athletes',
    targetUser: 'Athletes & Bodybuilders',
    items: [
      { name: 'Premium Salmon Fillet', description: 'Norwegian salmon, omega-3 rich', proteinGrams: 35 },
      { name: 'Quinoa Pilaf', description: 'With herbs and toasted almonds', proteinGrams: 5 },
      { name: 'Grilled Asparagus', description: 'Charred with garlic butter', proteinGrams: 0 },
    ],
    pricing: {
      trial: { 3: 1199, 5: 1899, 7: 2499 },
      weekly: 3499,
      monthly: 12999,
    },
    customizationRules: [
      { category: 'protein', maxSelections: 1, options: ['Salmon', 'Chicken', 'Prawns', 'Lamb'] },
      { category: 'carbs', maxSelections: 1, options: ['Quinoa', 'Brown Rice', 'Mashed Sweet Potato'] },
    ],
    addOnEligible: true,
    isTrialAvailable: true,
    image: '/placeholder.svg',
  },
  {
    id: 'royal-pack',
    name: 'Royal Pack',
    tier: 'royal',
    proteinPerMeal: 50,
    description: 'The ultimate nutrition experience for elite performers. Maximum protein, premium cuts, and chef-curated meals designed for those who demand the absolute best.',
    shortDescription: 'Ultimate nutrition for elite performers',
    targetUser: 'Elite Athletes & Professionals',
    items: [
      { name: 'Wagyu Beef Steak', description: 'A5 grade, perfectly seared', proteinGrams: 45 },
      { name: 'Truffle Mashed Potato', description: 'Creamy with black truffle', proteinGrams: 3 },
      { name: 'Roasted Root Vegetables', description: 'Heritage carrots and beetroot', proteinGrams: 2 },
    ],
    pricing: {
      trial: { 3: 1799, 5: 2799, 7: 3699 },
      weekly: 4999,
      monthly: 17999,
    },
    customizationRules: [
      { category: 'protein', maxSelections: 1, options: ['Wagyu Beef', 'Lobster', 'Lamb Rack', 'Duck Breast'] },
      { category: 'carbs', maxSelections: 1, options: ['Truffle Potato', 'Wild Rice', 'Cauliflower Puree'] },
    ],
    addOnEligible: true,
    isTrialAvailable: true,
    image: '/placeholder.svg',
  },
];

export const getMealPackById = (id: string): MealPack | undefined => {
  return mealPacks.find(pack => pack.id === id);
};

export const getMealPacksByTier = (tier: MealPack['tier']): MealPack[] => {
  return mealPacks.filter(pack => pack.tier === tier);
};

export const getTrialPacks = (): MealPack[] => {
  return mealPacks.filter(pack => pack.isTrialAvailable);
};
