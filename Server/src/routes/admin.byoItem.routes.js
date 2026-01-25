const express = require('express');
const multer = require('multer');

const {
	adminListByoItems,
	adminCreateByoItem,
	adminUpdateByoItem,
	adminDeleteByoItem,
	adminUploadByoItemImage,
} = require('../controllers/byoItem.controller');

const { ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE_BYTES } = require('../config/cloudinary.config');

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
	fileFilter: (req, file, cb) => {
		if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
			return cb(new Error('Invalid file type. Only JPEG, PNG, WEBP allowed'));
		}
		cb(null, true);
	},
});

const router = express.Router();

router.get('/', adminListByoItems);
router.post('/', upload.single('image'), adminCreateByoItem);
router.put('/:id', adminUpdateByoItem);
router.delete('/:id', adminDeleteByoItem);
router.post('/:id/image', upload.single('image'), adminUploadByoItemImage);

module.exports = router;
