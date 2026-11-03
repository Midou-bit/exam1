// notifi/server.js
const path = require('path');
// Charge le .env du service, quel que soit le dossier de lancement
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { logger, httpLogger } = require('./logger');
//console.log(`process evn is ${JSON.stringify(process.env)}`)

const app = express();
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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notifications', env: process.env.NODE_ENV || 'development', uptime: process.uptime() });
});

// Route pour envoyer un email
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
    return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email.', error });
  }
});

// Lancer le service Notification (PORT imposé par Render, sinon NOTIFI_PORT)
const PORT = process.env.PORT || process.env.NOTIFI_PORT || 4002;
app.listen(PORT, () => {
  logger.info(`Service de notification en écoute sur le port ${PORT}`);
});
