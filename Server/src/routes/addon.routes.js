const express = require('express');

const { listAddons } = require('../controllers/addon.controller');

const router = express.Router();

// Public Add-ons API (no auth)
router.get('/', listAddons);

module.exports = router;
