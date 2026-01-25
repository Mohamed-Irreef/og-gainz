const express = require('express');

const {
	listConsultations,
	getConsultationById,
	markConsultationRead,
	archiveConsultation,
	unarchiveConsultation,
	getUnreadCount,
} = require('../controllers/adminConsultation.controller');

const router = express.Router();

// List + badge counts must be defined before :id routes
router.get('/', listConsultations);
router.get('/unread-count', getUnreadCount);

router.get('/:id', getConsultationById);
router.patch('/:id/read', markConsultationRead);

// Soft delete / archive
router.patch('/:id/archive', archiveConsultation);
router.patch('/:id/unarchive', unarchiveConsultation);

module.exports = router;
