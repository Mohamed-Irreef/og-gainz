const express = require('express');

const {
	adminListIncludedItems,
	adminCreateIncludedItem,
	adminUpdateIncludedItem,
	adminDeleteIncludedItem,
} = require('../controllers/includedItem.controller');

const router = express.Router();

router.get('/', adminListIncludedItems);
router.post('/', adminCreateIncludedItem);
router.put('/:id', adminUpdateIncludedItem);
router.delete('/:id', adminDeleteIncludedItem);

module.exports = router;
