// server.js
const path = require('path');
// Charge le .env du service (quel que soit le dossier de lancement) avant tout le reste
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { logger, httpLogger } = require('./logger');

const app = express();
connectDB();

// Render place l'application derrière un proxy : IP client réelle et HTTPS correctement détectés
app.set('trust proxy', 1);
app.use(helmet());
// CORS limité aux origines autorisées (liste séparée par des virgules)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(httpLogger);
app.use(express.json());

// Sonde de santé (Uptime Kuma, health check Render) : 503 si MongoDB n'est pas connecté
app.get('/health', (req, res) => {
  const mongoState = mongoose.connection.readyState; // 1 = connecté
  const healthy = mongoState === 1;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'error',
    service: 'backend',
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    mongo: mongoState,
  });
});

app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Serveur en écoute sur le port ${PORT}`));
