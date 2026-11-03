// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();
const { logger } = require('../logger');

const connectDB = async () => {
    try {
        // Options useNewUrlParser / useUnifiedTopology obsolètes depuis Mongoose 6 ; l'URI (secrète) n'est jamais loggée
        await mongoose.connect(process.env.MONGO_URI);
        logger.info('MongoDB connecté');
    } catch (err) {
        logger.error('Échec de connexion à MongoDB', { error: err.message });
        process.exit(1);
    }
};

module.exports = connectDB;
