const { v2: cloudinary } = require('cloudinary');

const { ENV } = require('./env.config');

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const normalizeCloudinaryError = (err) => {
	if (err instanceof Error) {
		if (!err.statusCode) err.statusCode = 502;
		return err;
	}

	const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Cloudinary request failed';
	const e = new Error(message);
	e.statusCode = 502;
	if (err && typeof err === 'object') {
		e.name = String(err.name || e.name);
		if ('http_code' in err) e.http_code = err.http_code;
	}
	return e;
};

cloudinary.config({
	cloud_name: String(ENV.CLOUDINARY_CLOUD_NAME || '').trim().toLowerCase(),
	api_key: String(ENV.CLOUDINARY_API_KEY || '').trim(),
	api_secret: String(ENV.CLOUDINARY_API_SECRET || '').trim(),
});

const validateFile = (file) => {
	if (!file) {
		const err = new Error('Image file is required');
		err.statusCode = 400;
		throw err;
	}

	if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
		const err = new Error('Unsupported image type. Use JPG, PNG, or WEBP');
		err.statusCode = 400;
		throw err;
	}

	if (typeof file.size === 'number' && file.size > MAX_IMAGE_SIZE_BYTES) {
		const err = new Error('Image too large. Max size is 5MB');
		err.statusCode = 400;
		throw err;
	}
};

const assertCloudinaryConfigured = () => {
	const cloudName = String(ENV.CLOUDINARY_CLOUD_NAME || '').trim().toLowerCase();
	const apiKey = String(ENV.CLOUDINARY_API_KEY || '').trim();
	const apiSecret = String(ENV.CLOUDINARY_API_SECRET || '').trim();

	// "disabled" is a common placeholder in .env templates; treat as not configured.
	if (!cloudName || cloudName === 'disabled' || !apiKey || !apiSecret) {
		const err = new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
		err.statusCode = 503;
		throw err;
	}
};

/**
 * Uploads an image buffer to Cloudinary.
 * @param {{buffer: Buffer, mimetype: string, size?: number}} file
 * @param {string} folder
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadImage = async (file, folder) => {
	validateFile(file);
	assertCloudinaryConfigured();

	const targetFolder = folder || 'og-gainz';

	return new Promise((resolve, reject) => {
		let settled = false;
		const settle = (fn, value) => {
			if (settled) return;
			settled = true;
			fn(value);
		};

		const stream = cloudinary.uploader.upload_stream(
			{
				folder: targetFolder,
				resource_type: 'image',
				transformation: [{ quality: 'auto', fetch_format: 'auto' }],
			},
			(err, result) => {
				if (err || !result) {
					return settle(reject, normalizeCloudinaryError(err || new Error('Cloudinary upload failed')));
				}
				return settle(resolve, { url: result.secure_url, publicId: result.public_id });
			}
		);

		stream.on('error', (err) => settle(reject, normalizeCloudinaryError(err)));

		stream.end(file.buffer);
	});
};

const deleteImage = async (publicId) => {
	if (!publicId) return;
	try {
		assertCloudinaryConfigured();
	} catch {
		// If Cloudinary isn't configured, there's nothing we can delete.
		return;
	}
	try {
		await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
	} catch {
		// best-effort cleanup
	}
};

module.exports = {
	cloudinary,
	uploadImage,
	deleteImage,
	MAX_IMAGE_SIZE_BYTES,
	ALLOWED_MIME_TYPES,
};
