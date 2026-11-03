// backend/controllers/authController.js
/**
 * @module backend/controllers/authController
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // modèle utilisateur
require('dotenv').config();
const axios = require('axios');
const { logger } = require('../logger');
//const sendEmail = require('../services/emailService');

/**
 * @description Authentifie un utilisateur et renvoie un JWT valable 1 h.
 * @route POST /api/auth/login
 * @param {express.Request} req - Requête Express (corps validé : username, password)
 * @param {express.Response} res - Réponse Express
 * @param {express.NextFunction} next - Passe l'erreur au middleware d'erreur global
 * @returns {Promise<void>} 200 { token, role, username } ; 401 « Identifiants invalides »
 * @throws {Error} Erreur base de données, transmise à next (503 / 500)
 */
exports.login = async (req, res, next) => {
  const { username, password } = req.body;
  // Jamais de mot de passe ni de token dans les logs
  logger.debug('Tentative de connexion', { username });

  try {
    const user = await User.findOne({ username });
    // SEC-07 : même réponse pour un utilisateur inconnu et un mauvais mot de passe
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;
    if (!isMatch) {
      logger.warn('Échec de connexion', { username, ip: req.ip });
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    logger.info('Connexion réussie', { username: user.username });

    res.json({ token, role: user.role, username: user.username });
  } catch (error) {
    logger.error('Erreur lors de la connexion', { error: error.message });
    next(error);
  }
};

/**
 * @description Crée un compte utilisateur (rôle user), mot de passe hashé par le modèle User.
 * @route POST /api/auth/register
 * @param {express.Request} req - Requête Express (corps validé : username, email, password)
 * @param {express.Response} res - Réponse Express
 * @param {express.NextFunction} next - Passe l'erreur au middleware d'erreur global
 * @returns {Promise<void>} 201 si créé ; 409 si l'email ou le username existe déjà
 * @throws {Error} Erreur base de données, transmise à next
 */
exports.register = async (req, res, next) => {
  const { username, email, password } = req.body;
  logger.debug("Tentative d'inscription", { username });

  try {
    // BUG-05 : email ou nom d'utilisateur déjà utilisé → 409
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      logger.warn("Inscription refusée : email ou nom d'utilisateur déjà utilisé", { username });
      return res
        .status(409)
        .json({ message: "Cet email ou ce nom d'utilisateur est déjà utilisé." });
    }

    // Créer un nouvel utilisateur
    const user = new User({ username, email, password });
    await user.save();

    logger.info('Utilisateur créé', { username: user.username });

    // Envoyer un email de bienvenue
    // await sendEmail(
    //   email,
    //   'Bienvenue dans notre application',
    //   `Bonjour ${username},\n\nMerci de vous être inscrit. Nous sommes ravis de vous accueillir !`
    // );

    // await axios.post(`${process.env.GATEWAY_URL}/notify`, {
    //   to: email,
    //   subject: 'Bienvenue dans notre application',
    //   text: `Bonjour ${username},\n\nMerci de vous être inscrit. Nous sommes ravis de vous accueillir !`,
    // });

    res.status(201).json({ message: 'Utilisateur créé avec succès.' });
  } catch (error) {
    // Inscriptions simultanées : l'index unique de Mongo signale le doublon
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Cet email ou ce nom d'utilisateur est déjà utilisé." });
    }
    logger.error("Erreur lors de l'inscription", { error: error.message });
    next(error);
  }
};
