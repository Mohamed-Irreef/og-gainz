const express = require('express');

const {
	adminListAddonCategories,
	adminCreateAddonCategory,
	adminUpdateAddonCategory,
	adminDeleteAddonCategory,
} = require('../controllers/addonCategory.controller');

const router = express.Router();

router.get('/', adminListAddonCategories);
router.post('/', adminCreateAddonCategory);
router.put('/:id', adminUpdateAddonCategory);
router.delete('/:id', adminDeleteAddonCategory);

module.exports = router;
