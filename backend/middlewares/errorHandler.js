// backend/middlewares/errorHandler.js : BUG-01, erreurs toujours en JSON, jamais de stack trace
/**
 * @module backend/middlewares/errorHandler
 */
const mongoose = require('mongoose');
const { logger } = require('../logger');

// Erreurs signalant une base de données indisponible
const DB_ERRORS = new Set([
  'MongooseServerSelectionError',
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNotConnectedError',
]);

// Transmet au middleware d'erreur les rejets des contrôleurs async (Express 4 ne le fait pas)
/**
 * @description Enveloppe un contrôleur async pour transmettre ses rejets à next (Express 4).
 * @param {Function} fn - Contrôleur (req, res, next) => Promise
 * @returns {express.RequestHandler} Middleware Express
 */
exports.asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @description Réponse 404 JSON pour les routes inconnues.
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @returns {void}
 */
exports.notFound = (req, res) => res.status(404).json({ message: 'Ressource introuvable' });

// eslint-disable-next-line no-unused-vars
/**
 * @description Middleware d'erreur global : JSON uniquement, jamais de stack trace.
 * @param {Error} err - Erreur levée
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @param {express.NextFunction} next - Non utilisé (signature à 4 arguments requise)
 * @returns {void} 400 (JSON invalide, CastError, ValidationError), 503 (base indisponible), 500 sinon
 */
exports.errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Corps JSON invalide' });
  }
  // BUG-07 : identifiant mal formé ou données refusées par le modèle → 400
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: Object.values(err.errors)
        .map((e) => e.message)
        .join(' ; '),
    });
  }
  const dbDown = DB_ERRORS.has(err.name) || mongoose.connection.readyState !== 1;
  logger.error('Erreur non gérée', { error: err.message, name: err.name, url: req.originalUrl });
  if (dbDown) {
    return res.status(503).json({ message: 'Service temporairement indisponible' });
  }
  res.status(500).json({ message: 'Erreur serveur' });
};
