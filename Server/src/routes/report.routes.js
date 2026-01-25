const express = require('express');

const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const router = express.Router();

// Phase 2: Reports are admin-only (no report business logic in Phase 2)
router.use(authMiddleware);
router.use(adminMiddleware);

// Minimal protected stub endpoint
router.get('/status', (req, res) => {
	return res.status(501).json({
		status: 'error',
		message: 'Not Implemented: reports API (future phase)',
	});
});

module.exports = router;
