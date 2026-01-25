/*
 * Phase 3 seed: Meals & Add-ons
 *
 * Idempotent: safe to run multiple times.
 *
 * Source-of-truth note:
 * The repo currently does not include the referenced "Menu og.pdf".
 * Replace the arrays below with the values extracted from that menu.
 */

const mongoose = require('mongoose');

const { connectDB } = require('../config/db.config');
const MealPack = require('../models/MealPack.model');
const Addon = require('../models/Addon.model');

const seedMeals = async () => {
	const meals = [
		{
			name: 'Signature Plan',
			slug: 'signature-plan',
			shortDescription:
				'Foundational plan designed for consistent, high-protein meals with balanced calories.',
			detailedDescription:
				'Foundational plan designed for consistent, high-protein meals with balanced calories.',
			proteinPerMeal: 35,
			caloriesRange: 'Balanced Calories',
			mealType: 'signature',
			pricing: {
				monthly: { price: 7999, servings: 20 },
				weekly: { price: 2499, servings: 5 },
				trial: { price: 199, servings: 1 },
			},
			includedItems: {
				rice: true,
				veggies: true,
				chicken: true,
			},
			tags: ['signature'],
			isTrialEligible: true,
			isFeatured: true,
			displayOrder: 1,
			isActive: true,
		},
		{
			name: 'Elite Plan',
			slug: 'elite-plan',
			shortDescription:
				'Elevated plan for higher protein targets with premium ingredients and better macro distribution.',
			detailedDescription:
				'Elevated plan for higher protein targets with premium ingredients and better macro distribution.',
			proteinPerMeal: 40,
			caloriesRange: 'Balanced Calories',
			mealType: 'elite',
			hasWithProteinOption: true,
			hasWithoutProteinOption: true,
			pricing: {
				monthly: { price: 9999, servings: 20 },
				weekly: { price: 3499, servings: 5 },
				trial: { price: 249, servings: 1 },
			},
			includedItems: {
				rice: true,
				veggies: true,
				chicken: true,
				yogurt: true,
			},
			tags: ['elite'],
			isTrialEligible: true,
			isFeatured: false,
			displayOrder: 2,
			isActive: true,
		},
		{
			name: 'Royal Plan',
			slug: 'royal-plan',
			shortDescription:
				'Highest protein plan for serious athletes who want maximum performance nutrition.',
			detailedDescription:
				'Highest protein plan for serious athletes who want maximum performance nutrition.',
			proteinPerMeal: 50,
			caloriesRange: 'Balanced Calories',
			mealType: 'royal',
			hasWithProteinOption: true,
			hasWithoutProteinOption: true,
			pricing: {
				monthly: { price: 12999, servings: 20 },
				weekly: { price: 4999, servings: 5 },
				trial: { price: 299, servings: 1 },
			},
			includedItems: {
				rice: true,
				veggies: true,
				chicken: true,
				proteinCurd: true,
				nutsDryFruits: true,
			},
			tags: ['royal'],
			isTrialEligible: true,
			isFeatured: false,
			displayOrder: 3,
			isActive: true,
		},
	];

	for (const meal of meals) {
		await MealPack.updateOne(
			{ slug: meal.slug },
			{ $set: meal },
			{ upsert: true }
		);
	}
};

const seedAddons = async () => {
	const addons = [
		{
			name: 'Extra Chicken Breast',
			category: 'protein',
			description: 'Extra lean protein add-on',
			pricing: { single: 149, monthly: 1999 },
			proteinGrams: 30,
			servingSizeText: '~150g',
			displayOrder: 1,
			isActive: true,
		},
		{
			name: 'Boiled Eggs (4 pcs)',
			category: 'protein',
			description: 'Classic protein booster',
			pricing: { single: 79 },
			proteinGrams: 24,
			servingSizeText: '4 pcs',
			displayOrder: 2,
			isActive: true,
		},
		{
			name: 'Extra Brown Rice',
			category: 'carbs',
			pricing: { single: 49 },
			servingSizeText: '~150g',
			displayOrder: 1,
			isActive: true,
		},
		{
			name: 'Mixed Green Salad',
			category: 'salad',
			pricing: { single: 79, monthly: 899 },
			servingSizeText: '~200g',
			displayOrder: 1,
			isActive: true,
		},
		{
			name: 'Whey Protein Shake',
			category: 'shake',
			pricing: { single: 149, monthly: 2499 },
			proteinGrams: 25,
			servingSizeText: '1 bottle',
			displayOrder: 1,
			isActive: true,
		},
	];

	for (const addon of addons) {
		await Addon.updateOne(
			{ name: addon.name, category: addon.category },
			{ $set: addon },
			{ upsert: true }
		);
	}
};

const run = async () => {
	await connectDB();
	await seedMeals();
	await seedAddons();

	// eslint-disable-next-line no-console
	console.log('✅ Seeded meals and add-ons');
	await mongoose.connection.close(false);
	process.exit(0);
};

run().catch(async (err) => {
	// eslint-disable-next-line no-console
	console.error('❌ Seed failed:', err);
	try {
		await mongoose.connection.close(false);
	} catch {
		// ignore
	}
	process.exit(1);
});
