const express = require('express');

const auth = require('../middlewares/auth.middleware');
const { submitConsultation } = require('../controllers/consultation.controller');

const router = express.Router();

router.use(auth);

// User submits consultation request
router.post('/', submitConsultation);

module.exports = router;
