// gateway/routes/auth.js
const express = require('express');
const proxy = require('express-http-proxy');
require('dotenv').config();
const router = express.Router();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;

router.use('/', proxy(AUTH_SERVICE_URL, {
  proxyReqPathResolver: (req) => req.originalUrl,
}));

module.exports = router;
