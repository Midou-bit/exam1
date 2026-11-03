// backend/routes/authRoutes.js
const express = require('express');
const { login, register } = require('../controllers/authController');
const { asyncHandler } = require('../middlewares/errorHandler');
const validate = require('../middlewares/validate');
const { loginSchema } = require('../validators/authValidators');

const router = express.Router();

router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/register', asyncHandler(register));

module.exports = router;
