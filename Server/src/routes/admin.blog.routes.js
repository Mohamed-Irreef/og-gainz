const express = require('express');
const multer = require('multer');

const {
  adminListBlogs,
  adminGetBlog,
  adminCreateBlog,
  adminUpdateBlog,
  adminDeleteBlog,
  adminTogglePublish,
  adminToggleFeatured,
  adminUploadCoverImage,
  adminUploadBannerImage,
} = require('../controllers/blog.controller');
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

router.get('/', adminListBlogs);
router.post('/', adminCreateBlog);
router.get('/:id', adminGetBlog);
router.put('/:id', adminUpdateBlog);
router.delete('/:id', adminDeleteBlog);
router.patch('/:id/publish', adminTogglePublish);
router.patch('/:id/featured', adminToggleFeatured);
router.post('/:id/cover', upload.single('image'), adminUploadCoverImage);
router.post('/:id/banner', upload.single('image'), adminUploadBannerImage);

module.exports = router;
