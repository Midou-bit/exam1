// notifi/server.js
/**
 * @module microservices/notifications
 */
const path = require('path');
// Charge le .env du service, quel que soit le dossier de lancement
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { logger, httpLogger } = require('./logger');
const internalAuth = require('./internalAuth');
//console.log(`process evn is ${JSON.stringify(process.env)}`)

const app = express();
// SEC-08 : ne pas annoncer la technologie utilisée
app.disable('x-powered-by');
app.use(httpLogger);
app.use(bodyParser.json());

// Configuration de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Adresse Gmail
    pass: process.env.EMAIL_APPLICATION_PASSWORD, // Mot de passe spécifique à l'application
  },
});

// Sonde de santé (Uptime Kuma, health check Render)
/**
 * @description Sonde de santé de notifications (Render, Uptime Kuma).
 * @route GET /health
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @returns {void} 200 { status, service, env, appEnv, uptime }
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notifications', env: process.env.NODE_ENV || 'development', appEnv: process.env.APP_ENV || 'local', uptime: process.uptime() });
});

// SEC-02 : clé interne obligatoire (sauf /health)
app.use(internalAuth);

// Route pour envoyer un email
/**
 * @description Envoie un email via Nodemailer (Gmail).
 * @route POST /notify
 * @param {express.Request} req - Requête Express (corps : to, subject, text ; en-tête x-internal-key)
 * @param {express.Response} res - Réponse Express
 * @returns {Promise<void>} 200 si envoyé ; 500 générique en cas d'échec (détail dans les logs)
 */
app.post('/notify', async (req, res) => {
  const { to, subject, text } = req.body;
  logger.info('Demande de notification', { subject });

  //const { message } = req.body;
    //console.log(`Notification: ${text}`);
    //res.send('Notification envoyée mail');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Email envoyé avec succès', { subject });
    return res.status(200).json({ message: 'Email envoyé avec succès.' });
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de l\'email', { error: error.message });
    // SEC-08 : le détail de l'erreur SMTP reste dans les logs
    return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email.' });
  }
});

// SEC-08 : 404 et erreurs en JSON, sans détail interne
app.use((req, res) => res.status(404).json({ message: 'Ressource introuvable' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Erreur non gérée', { error: err.message, url: req.originalUrl });
  res.status(err.type === 'entity.parse.failed' ? 400 : 500).json({ message: err.type === 'entity.parse.failed' ? 'Corps JSON invalide' : 'Erreur serveur' });
});

// Lancer le service Notification (PORT imposé par Render, sinon NOTIFI_PORT)
const PORT = process.env.PORT || process.env.NOTIFI_PORT || 4002;
app.listen(PORT, () => {
  logger.info(`Service de notification en écoute sur le port ${PORT}`);
});
