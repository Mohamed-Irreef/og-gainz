const EARTH_RADIUS_KM = 6371;

const toNumber = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const validateLatLng = ({ latitude, longitude }) => {
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
};

const haversineDistanceKm = ({ from, to }) => {
  if (!validateLatLng(from) || !validateLatLng(to)) return NaN;

  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const roundToDecimals = (value, decimals) => {
  if (!isFiniteNumber(value)) return value;
  const d = clampNumber(toNumber(decimals) ?? 1, 0, 6);
  const factor = Math.pow(10, d);
  return Math.round(value * factor) / factor;
};

const applyBufferFactor = (distanceKm, bufferFactor) => {
  if (!isFiniteNumber(distanceKm)) return distanceKm;
  const factor = clampNumber(toNumber(bufferFactor) ?? 1, 1, 3);
  return distanceKm * factor;
};

module.exports = {
  validateLatLng,
  haversineDistanceKm,
  roundToDecimals,
  applyBufferFactor,
};
