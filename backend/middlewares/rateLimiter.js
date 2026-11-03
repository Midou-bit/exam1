// backend/middlewares/rateLimiter.js : SEC-04, limite les tentatives sur /api/auth (force brute)
const rateLimit = require('express-rate-limit');

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // tentatives par IP sur la fenêtre
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives, réessayez dans 15 minutes.' },
});
