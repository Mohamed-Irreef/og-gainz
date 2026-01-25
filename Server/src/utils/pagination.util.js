const parsePositiveInt = (value, fallback) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
};

const getPagination = (query, { defaultLimit = 12, maxLimit = 100 } = {}) => {
	const page = parsePositiveInt(query.page, 1);
	const limit = Math.min(parsePositiveInt(query.limit, defaultLimit), maxLimit);
	const skip = (page - 1) * limit;
	return { page, limit, skip };
};

module.exports = { getPagination };
