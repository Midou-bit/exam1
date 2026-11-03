/**
 * @module microservices/stock-management
 */
const express = require('express');
const { logger, httpLogger } = require('./logger');
const internalAuth = require('./internalAuth');
const app = express();
// SEC-08 : ne pas annoncer la technologie utilisée
app.disable('x-powered-by');
// PORT imposé par Render, sinon port historique 4003
const PORT = process.env.PORT || 4003;

app.use(httpLogger);
app.use(express.json());

// Sonde de santé (Uptime Kuma, health check Render)
/**
 * @description Sonde de santé de stock-management (Render, Uptime Kuma).
 * @route GET /health
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @returns {void} 200 { status, service, env, appEnv, uptime }
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'stock-management',
    env: process.env.NODE_ENV || 'development',
    appEnv: process.env.APP_ENV || 'local',
    uptime: process.uptime(),
  });
});

// SEC-02 : clé interne obligatoire (sauf /health)
app.use(internalAuth);

/**
 * @description Reçoit une mise à jour de stock (journalisée).
 * @route POST /update-stock
 * @param {express.Request} req - Requête Express (corps : productId, quantity ; en-tête x-internal-key)
 * @param {express.Response} res - Réponse Express
 * @returns {void} 200 texte de confirmation
 */
app.post('/update-stock', (req, res) => {
  const { productId, quantity } = req.body;
  logger.info('Mise à jour du stock', { productId, quantity });
  res.send(`Stock mis à jour pour le produit de ID : ${productId}`);
});

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

app.listen(PORT, () => logger.info(`Service de gestion des stocks sur le port ${PORT}`));
