const getPricingPlanPrice = (pricing, plan) => {
  if (!pricing || !plan) return 0;
  const tier = pricing?.[plan];
  if (typeof tier === 'number') return Number.isFinite(tier) ? tier : 0;
  return Number(tier?.price ?? 0);
};

const getMealUnitPrice = ({ meal, plan }) => {
  if (!meal) return 0;

  const fromDefault = getPricingPlanPrice(meal.pricing, plan);
  if (fromDefault > 0) return fromDefault;

  const fromWith = getPricingPlanPrice(meal.proteinPricing?.withProtein, plan);
  if (fromWith > 0) return fromWith;
  const fromWithout = getPricingPlanPrice(meal.proteinPricing?.withoutProtein, plan);
  if (fromWithout > 0) return fromWithout;

  return 0;
};

const getAddonUnitPrice = ({ addon, plan }) => {
  if (!addon) return 0;
  if (plan === 'trial') return Number(addon.pricing?.single ?? 0);
  if (plan === 'single') return Number(addon.pricing?.single ?? 0);
  if (plan === 'weekly') return Number(addon.pricing?.weekly ?? 0);
  if (plan === 'monthly') return Number(addon.pricing?.monthly ?? 0);
  return 0;
};

module.exports = {
  getPricingPlanPrice,
  getMealUnitPrice,
  getAddonUnitPrice,
};
