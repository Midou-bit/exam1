// gateway/routes/notifi.js
const express = require('express');
const proxy = require('express-http-proxy');
require('dotenv').config();

const router = express.Router();

const NOTIFI_SERVICE_URL = process.env.NOTIFI_SERVICE_URL;

router.use('/', proxy(NOTIFI_SERVICE_URL, {
  proxyReqPathResolver: (req) => req.originalUrl,
}));

module.exports = router;
