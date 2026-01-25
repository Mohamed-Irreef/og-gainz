const toSlug = (input) => {
	if (!input) return '';
	return String(input)
		.trim()
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-{2,}/g, '-');
};

module.exports = { toSlug };
