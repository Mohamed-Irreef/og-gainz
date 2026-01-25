const express = require('express');

const {
	adminListMealTypes,
	adminCreateMealType,
	adminUpdateMealType,
	adminDeleteMealType,
} = require('../controllers/mealType.controller');

const router = express.Router();

router.get('/', adminListMealTypes);
router.post('/', adminCreateMealType);
router.put('/:id', adminUpdateMealType);
router.delete('/:id', adminDeleteMealType);

module.exports = router;
