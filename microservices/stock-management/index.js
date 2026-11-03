const express = require('express');
const { logger, httpLogger } = require('./logger');
const internalAuth = require('./internalAuth');
const app = express();
// PORT imposé par Render, sinon port historique 4003
const PORT = process.env.PORT || 4003;

app.use(httpLogger);
app.use(express.json());

// Sonde de santé (Uptime Kuma, health check Render)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'stock-management', env: process.env.NODE_ENV || 'development', appEnv: process.env.APP_ENV || 'local', uptime: process.uptime() });
});

// SEC-02 : clé interne obligatoire (sauf /health)
app.use(internalAuth);

app.post('/update-stock', (req, res) => {
    const { productId, quantity } = req.body;
    logger.info('Mise à jour du stock', { productId, quantity });
    res.send(`Stock mis à jour pour le produit de ID : ${productId}`);
});

app.listen(PORT, () => logger.info(`Service de gestion des stocks sur le port ${PORT}`));
