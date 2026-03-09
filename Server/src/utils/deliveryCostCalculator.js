const calculateDeliveryCost = (distanceKm, freeRadiusKm, costPerKm) => {
  const distance = Number(distanceKm);
  const free = Number(freeRadiusKm);
  const perKm = Number(costPerKm);
  if (!Number.isFinite(distance) || distance <= 0) return 0;
  const chargeable = Math.max(0, distance - (Number.isFinite(free) ? free : 0));
  const rate = Number.isFinite(perKm) ? perKm : 0;
  return chargeable * rate;
};

module.exports = {
  calculateDeliveryCost,
};
