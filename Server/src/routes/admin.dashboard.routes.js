const express = require('express');

const { getAdminDashboard } = require('../controllers/adminDashboard.controller');

const router = express.Router();

// GET /api/admin/dashboard
router.get('/', getAdminDashboard);

module.exports = router;
