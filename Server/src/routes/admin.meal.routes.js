const express = require('express');
const multer = require('multer');

const {
	adminListMeals,
	adminCreateMeal,
	adminUpdateMeal,
	adminDeleteMeal,
	adminUploadMealImage,
	adminAddMealImages,
	adminReplaceMealImageAtIndex,
	adminDeleteMealImageAtIndex,
	adminMakeMealImagePrimary,
} = require('../controllers/meal.controller');
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

router.get('/', adminListMeals);
router.post('/', adminCreateMeal);
router.put('/:id', adminUpdateMeal);
router.delete('/:id', adminDeleteMeal);
router.post('/:id/image', upload.single('image'), adminUploadMealImage);
router.post('/:id/images', upload.array('images', 10), adminAddMealImages);
router.put('/:id/images/:index', upload.single('image'), adminReplaceMealImageAtIndex);
router.delete('/:id/images/:index', adminDeleteMealImageAtIndex);
router.patch('/:id/images/:index/make-primary', adminMakeMealImagePrimary);

module.exports = router;
