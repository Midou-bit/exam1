// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();
const { logger } = require('../logger');

// BUG-01 : pas de mise en file des requêtes quand la base est absente (erreur immédiate → 503)
mongoose.set('bufferCommands', false);

const RETRY_DELAY_MS = 5000;

const connectDB = async () => {
    try {
        // Options useNewUrlParser / useUnifiedTopology obsolètes depuis Mongoose 6 ; l'URI (secrète) n'est jamais loggée
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        logger.info('MongoDB connecté');
    } catch (err) {
        // BUG-01 : le processus reste en vie (/health répond 503) et retente la connexion
        logger.error('Échec de connexion à MongoDB, nouvelle tentative', { error: err.message, retryInMs: RETRY_DELAY_MS });
        setTimeout(connectDB, RETRY_DELAY_MS);
    }
};

mongoose.connection.on('disconnected', () => logger.warn('MongoDB déconnecté'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnecté'));

module.exports = connectDB;
