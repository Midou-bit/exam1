// gateway/server.js
/**
 * @module gateway/server
 */
const path = require('path');
// Charge le .env du service avant les routes (qui lisent les URLs des microservices)
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const helmet = require('helmet');
const { logger, httpLogger } = require('./logger');
const internalAuth = require('./internalAuth');
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
/**
 * @description Sonde de santé de la gateway (Render, Uptime Kuma).
 * @route GET /health
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @returns {void} 200 { status, service, env, appEnv, uptime }
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'gateway',
    env: process.env.NODE_ENV || 'development',
    appEnv: process.env.APP_ENV || 'local',
    uptime: process.uptime(),
  });
});

// SEC-02 : clé interne obligatoire pour toutes les routes (sauf /health)
app.use(internalAuth);

// Routes principales pour chaque microservice
//app.use('/auth', authProxy);
/**
 * @description Proxys vers les microservices (clé interne exigée en amont).
 * @route POST /notify → notifications
 * @route POST /update-stock → stock-management
 */
app.use('/notify', notifiProxy);
app.use('/update-stock', stockProxy);

// SEC-08 : 404 et erreurs en JSON, sans détail interne
app.use((req, res) => res.status(404).json({ message: 'Ressource introuvable' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Erreur non gérée', { error: err.message, url: req.originalUrl });
  res
    .status(err.type === 'entity.parse.failed' ? 400 : 500)
    .json({
      message: err.type === 'entity.parse.failed' ? 'Corps JSON invalide' : 'Erreur serveur',
    });
});

// Lancer le Gateway (PORT imposé par Render, sinon GATEWAY_PORT)
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 8000;
app.listen(PORT, () => {
  logger.info(`Gateway opérationnel sur le port ${PORT}`);
});
