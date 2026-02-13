const express = require('express');

const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');
const { getAdminSettings, updateAdminSettings } = require('../controllers/adminSettings.controller');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', getAdminSettings);
router.put('/', updateAdminSettings);

module.exports = router;
