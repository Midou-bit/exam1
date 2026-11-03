// gateway/routes/notifi.js
const express = require('express');
const proxy = require('express-http-proxy');

const router = express.Router();

// URL du microservice (variable d'environnement, défaut local) ; dotenv est chargé par server.js
const NOTIFI_SERVICE_URL = process.env.NOTIFI_SERVICE_URL || 'http://localhost:4002';

router.use(
  '/',
  proxy(NOTIFI_SERVICE_URL, {
    proxyReqPathResolver: (req) => req.originalUrl,
  }),
);

module.exports = router;
