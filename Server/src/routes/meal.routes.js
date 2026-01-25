const express = require('express');

const { listMeals, getMealBySlug } = require('../controllers/meal.controller');

const router = express.Router();

// Public Meals API (no auth)
router.get('/', listMeals);
router.get('/:slug', getMealBySlug);

module.exports = router;
