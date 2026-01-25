// Backend-only deterministic distance engine (no external calls).
// Implements Haversine distance, applies a single urban adjustment factor,
// then rounds once at the end to 2 decimals.

const EARTH_RADIUS_KM = 6371;
const URBAN_ADJUSTMENT_FACTOR = 1.2;

// Fixed kitchen location (Phase 4 spec)
const KITCHEN_LOCATION = {
	lat: 12.89245,
	lng: 80.204236,
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const createInvalidCoordinatesError = (message) => {
	const err = new Error(message);
	err.statusCode = 400;
	err.code = 'INVALID_COORDINATES';
	return err;
};

const validateLatLng = (lat, lng) => {
	if (typeof lat !== 'number' || !Number.isFinite(lat)) return false;
	if (typeof lng !== 'number' || !Number.isFinite(lng)) return false;
	if (lat < -90 || lat > 90) return false;
	if (lng < -180 || lng > 180) return false;
	return true;
};

/**
 * calculateDistanceKm
 *
 * Computes an adjusted “real-world” travel distance between the fixed kitchen
 * and a customer coordinate using the Haversine formula.
 *
 * Rules:
 * - Validate inputs strictly (finite numbers + valid ranges)
 * - Convert degrees -> radians
 * - Use EARTH_RADIUS_KM = 6371
 * - Apply ONE urban adjustment factor (1.2)
 * - Round ONLY once at the end to 2 decimals
 * - Return a number (not a string)
 */
const calculateDistanceKm = (customerLat, customerLng) => {
	if (!validateLatLng(customerLat, customerLng)) {
		throw createInvalidCoordinatesError('Invalid customer latitude/longitude');
	}

	// Quick deterministic short-circuit for exact kitchen coordinate.
	if (customerLat === KITCHEN_LOCATION.lat && customerLng === KITCHEN_LOCATION.lng) {
		return 0;
	}

	// Convert all coordinates to radians before applying the formula.
	const lat1 = toRadians(KITCHEN_LOCATION.lat);
	const lng1 = toRadians(KITCHEN_LOCATION.lng);
	const lat2 = toRadians(customerLat);
	const lng2 = toRadians(customerLng);

	const dLat = lat2 - lat1;
	const dLng = lng2 - lng1;

	// Haversine formula
	const sinDLat = Math.sin(dLat / 2);
	const sinDLng = Math.sin(dLng / 2);

	const a =
		sinDLat * sinDLat +
		Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const haversineDistanceKm = EARTH_RADIUS_KM * c;

	// Single, realistic urban adjustment factor.
	const adjustedDistanceKm = haversineDistanceKm * URBAN_ADJUSTMENT_FACTOR;

	// Round once at the very end.
	return Number(adjustedDistanceKm.toFixed(2));
};

module.exports = {
	calculateDistanceKm,
};
