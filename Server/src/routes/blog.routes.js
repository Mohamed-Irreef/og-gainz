const express = require('express');
const {
  listBlogs,
  getBlogBySlug,
  getRelatedBlogs,
} = require('../controllers/blog.controller');

const router = express.Router();

// Public Blog API (no auth required)
router.get('/', listBlogs);
router.get('/featured', (req, res, next) => {
  req.query.featured = 'true';
  return listBlogs(req, res, next);
});
router.get('/published', listBlogs);
router.get('/:slug/related', getRelatedBlogs);
router.get('/:slug', getBlogBySlug);

module.exports = router;
