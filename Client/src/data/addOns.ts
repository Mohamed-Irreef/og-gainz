import type { AddOn } from '@/types';

export const addOns: AddOn[] = [
  // Protein Add-ons
  {
    id: 'extra-chicken',
    name: 'Extra Chicken Breast',
    category: 'protein',
    description: 'Additional 150g grilled chicken breast',
    priceOneTime: 149,
    priceSubscription: 129,
    image: '/placeholder.svg',
    proteinGrams: 30,
    isAvailable: true,
  },
  {
    id: 'extra-eggs',
    name: 'Boiled Eggs (4 pcs)',
    category: 'protein',
    description: 'Farm-fresh eggs, perfectly boiled',
    priceOneTime: 79,
    priceSubscription: 69,
    image: '/placeholder.svg',
    proteinGrams: 24,
    isAvailable: true,
  },
  {
    id: 'extra-paneer',
    name: 'Grilled Paneer',
    category: 'protein',
    description: '100g cottage cheese, herb-marinated',
    priceOneTime: 119,
    priceSubscription: 99,
    image: '/placeholder.svg',
    proteinGrams: 18,
    isAvailable: true,
  },
  {
    id: 'extra-fish',
    name: 'Grilled Fish Fillet',
    category: 'protein',
    description: '150g white fish, lemon herb',
    priceOneTime: 199,
    priceSubscription: 179,
    image: '/placeholder.svg',
    proteinGrams: 35,
    isAvailable: true,
  },

  // Sides
  {
    id: 'extra-rice',
    name: 'Extra Brown Rice',
    category: 'sides',
    description: '150g portion of brown rice',
    priceOneTime: 49,
    priceSubscription: 39,
    image: '/placeholder.svg',
    isAvailable: true,
  },
  {
    id: 'mixed-salad',
    name: 'Mixed Green Salad',
    category: 'sides',
    description: 'Fresh greens with olive oil dressing',
    priceOneTime: 79,
    priceSubscription: 69,
    image: '/placeholder.svg',
    isAvailable: true,
  },
  {
    id: 'sweet-potato',
    name: 'Roasted Sweet Potato',
    category: 'sides',
    description: '150g honey-glazed sweet potato',
    priceOneTime: 69,
    priceSubscription: 59,
    image: '/placeholder.svg',
    isAvailable: true,
  },

  // Shakes
  {
    id: 'whey-shake',
    name: 'Whey Protein Shake',
    category: 'shakes',
    description: '25g protein, chocolate or vanilla',
    priceOneTime: 149,
    priceSubscription: 129,
    image: '/placeholder.svg',
    proteinGrams: 25,
    isAvailable: true,
  },
  {
    id: 'mass-gainer',
    name: 'Mass Gainer Shake',
    category: 'shakes',
    description: '30g protein + complex carbs',
    priceOneTime: 199,
    priceSubscription: 179,
    image: '/placeholder.svg',
    proteinGrams: 30,
    isAvailable: true,
  },
  {
    id: 'green-smoothie',
    name: 'Green Power Smoothie',
    category: 'shakes',
    description: 'Spinach, banana, whey blend',
    priceOneTime: 129,
    priceSubscription: 109,
    image: '/placeholder.svg',
    proteinGrams: 20,
    isAvailable: true,
  },

  // Snacks
  {
    id: 'protein-bar',
    name: 'Protein Bar',
    category: 'snacks',
    description: '20g protein, peanut butter flavor',
    priceOneTime: 99,
    priceSubscription: 89,
    image: '/placeholder.svg',
    proteinGrams: 20,
    isAvailable: true,
  },
  {
    id: 'mixed-nuts',
    name: 'Mixed Nuts (100g)',
    category: 'snacks',
    description: 'Almonds, cashews, walnuts',
    priceOneTime: 149,
    priceSubscription: 129,
    image: '/placeholder.svg',
    proteinGrams: 15,
    isAvailable: true,
  },
];

export const getAddOnById = (id: string): AddOn | undefined => {
  return addOns.find(addon => addon.id === id);
};

export const getAddOnsByCategory = (category: AddOn['category']): AddOn[] => {
  return addOns.filter(addon => addon.category === category);
};

export const getAvailableAddOns = (): AddOn[] => {
  return addOns.filter(addon => addon.isAvailable);
};
