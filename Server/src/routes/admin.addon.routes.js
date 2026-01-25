const express = require('express');
const multer = require('multer');

const {
	adminListAddons,
	adminCreateAddon,
	adminUpdateAddon,
	adminDeleteAddon,
	adminUploadAddonImage,
	adminAddAddonImages,
	adminReplaceAddonImageAtIndex,
	adminDeleteAddonImageAtIndex,
	adminMakeAddonImagePrimary,
} = require('../controllers/addon.controller');
const { ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE_BYTES } = require('../config/cloudinary.config');

const router = express.Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
	fileFilter: (req, file, cb) => {
		if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
			const err = new Error('Unsupported image type. Use JPG, PNG, or WEBP');
			err.statusCode = 400;
			return cb(err);
		}
		return cb(null, true);
	},
});

router.get('/', adminListAddons);
router.post('/', adminCreateAddon);
router.put('/:id', adminUpdateAddon);
router.delete('/:id', adminDeleteAddon);
router.post('/:id/image', upload.single('image'), adminUploadAddonImage);
router.post('/:id/images', upload.array('images', 10), adminAddAddonImages);
router.put('/:id/images/:index', upload.single('image'), adminReplaceAddonImageAtIndex);
router.delete('/:id/images/:index', adminDeleteAddonImageAtIndex);
router.patch('/:id/images/:index/make-primary', adminMakeAddonImagePrimary);

module.exports = router;
