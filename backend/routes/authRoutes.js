// backend/routes/authRoutes.js
const express = require('express');
const { login, register } = require('../controllers/authController');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

router.post('/login', asyncHandler(login));
router.post('/register', asyncHandler(register));

module.exports = router;
