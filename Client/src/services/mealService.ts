// OZ GAINZ Meal Service - Synchronous mock data layer
import type { MealPack, AddOn } from '@/types';
import type { Meal, PaginatedResponse, SingleResponse } from '@/types/catalog';
import { mealsCatalogService } from './mealsCatalogService';
import { mealPacks, getMealPackById as getPackById, getTrialPacks as getTrials } from '@/data/mealPacks';
import { addOns, getAddOnById as getAddonById, getAddOnsByCategory, getAvailableAddOns } from '@/data/addOns';
export const mealService = {
  // Phase 3: backend-driven catalog (used when VITE_USE_MOCKS=false inside mealsCatalogService)
  async listMeals(params?: { page?: number; limit?: number }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<Meal>> {
    return mealsCatalogService.listMeals(params, options);
  },

  async getMealBySlug(slug: string, options?: { signal?: AbortSignal }): Promise<SingleResponse<Meal>> {
    return mealsCatalogService.getMealBySlug(slug, options);
  },

  // Get all meal packs (sync for mock data)
  getMealPacks(): MealPack[] {
    return [...mealPacks];
  },

  // Get single meal pack by ID
  getMealPackById(id: string): MealPack | null {
    return getPackById(id) || null;
  },

  // Get trial-eligible packs
  getTrialPacks(): MealPack[] {
    return getTrials();
  },

  // Get all add-ons
  getAddOns(): AddOn[] {
    return getAvailableAddOns();
  },

  // Get add-on by ID
  getAddOnById(id: string): AddOn | null {
    return getAddonById(id) || null;
  },

  // Get add-ons by category
  getAddOnsByCategory(category: AddOn['category']): AddOn[] {
    return getAddOnsByCategory(category);
  },
  // Get pack tier display name
  getTierDisplayName(tier: MealPack['tier']): string {
    const names = {
      signature: 'Signature',
      elite: 'Elite',
      royal: 'Royal',
    };
    return names[tier];
  },

  // Get tier color class
  getTierColorClass(tier: MealPack['tier']): string {
    const colors = {
      signature: 'bg-secondary text-secondary-foreground',
      elite: 'bg-oz-secondary text-oz-secondary-foreground',
      royal: 'bg-accent text-accent-foreground',
    };
    return colors[tier];
  },
};
