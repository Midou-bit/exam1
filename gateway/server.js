// gateway/server.js
const path = require('path');
// Charge le .env du service avant les routes (qui lisent les URLs des microservices)
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const helmet = require('helmet');
const { logger, httpLogger } = require('./logger');
//const authProxy = require('./routes/auth');
const notifiProxy = require('./routes/notifi');
const stockProxy = require('./routes/stock');

const app = express();

// Render place l'application derrière un proxy
app.set('trust proxy', 1);
app.use(helmet());
app.use(httpLogger);

// Middleware pour analyser les requêtes JSON
app.use(express.json());

// Sonde de santé (Uptime Kuma, health check Render)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway', env: process.env.NODE_ENV || 'development', uptime: process.uptime() });
});

// Routes principales pour chaque microservice
//app.use('/auth', authProxy);
app.use('/notify', notifiProxy);
app.use('/update-stock', stockProxy);

// Lancer le Gateway (PORT imposé par Render, sinon GATEWAY_PORT)
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 8000;
app.listen(PORT, () => {
  logger.info(`Gateway opérationnel sur le port ${PORT}`);
});
