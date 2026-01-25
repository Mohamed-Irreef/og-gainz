const express = require('express');

const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Phase 1 skeleton only (no real auth yet)
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/google', authController.google);
router.get('/verify', authMiddleware, authController.verify);

module.exports = router;
