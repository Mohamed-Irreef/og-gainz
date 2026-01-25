const express = require('express');

const {
	adminGetByoConfig,
	adminUpdateByoConfig,
} = require('../controllers/byoConfig.controller');

const router = express.Router();

router.get('/', adminGetByoConfig);
router.put('/', adminUpdateByoConfig);

module.exports = router;
