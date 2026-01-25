const express = require('express');
const auth = require('../middlewares/auth.middleware');
const { getMe, updateMe } = require('../controllers/user.controller');

const router = express.Router();

router.use(auth);

router.get('/me', getMe);
router.patch('/me', updateMe);

module.exports = router;
