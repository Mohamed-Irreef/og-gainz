const express = require('express');

const { initiateCheckout, retryCheckout } = require('../controllers/checkout.controller');
const auth = require('../middlewares/auth.middleware');
const ensureNotBlocked = require('../middlewares/blocked.middleware');

const router = express.Router();

router.post('/initiate', auth, ensureNotBlocked, initiateCheckout);
router.post('/retry', auth, ensureNotBlocked, retryCheckout);

module.exports = router;
