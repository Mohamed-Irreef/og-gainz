const express = require('express');

const {
	adminListByoItemTypes,
	adminCreateByoItemType,
	adminUpdateByoItemType,
	adminDeleteByoItemType,
} = require('../controllers/byoItemType.controller');

const router = express.Router();

router.get('/', adminListByoItemTypes);
router.post('/', adminCreateByoItemType);
router.put('/:id', adminUpdateByoItemType);
router.delete('/:id', adminDeleteByoItemType);

module.exports = router;
