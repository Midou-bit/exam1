// internalAuth.js : SEC-02, seules les requêtes portant la clé interne (x-internal-key) sont acceptées
/**
 * @module microservices/stock-management/internalAuth
 */
const crypto = require('crypto');
const { logger } = require('./logger');

// Empreintes de longueur fixe : comparaison à temps constant sans fuite de longueur
/**
 * @description Empreinte SHA-256 de longueur fixe, pour une comparaison à temps constant.
 * @param {string} value - Valeur à hacher
 * @returns {Buffer}
 */
const digest = (value) => crypto.createHash('sha256').update(String(value)).digest();

/**
 * @description Exige l'en-tête x-internal-key égal à INTERNAL_API_KEY (comparaison crypto.timingSafeEqual), sauf sur /health.
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @param {express.NextFunction} next - Suite de la chaîne
 * @returns {void} 401 « Non autorisé » si la clé est absente, invalide ou non configurée
 */
module.exports = (req, res, next) => {
  if (req.path === '/health') return next();
  const expected = process.env.INTERNAL_API_KEY;
  const provided = req.get('x-internal-key');
  // Refus par défaut si la clé n'est pas configurée
  if (!expected || !provided || !crypto.timingSafeEqual(digest(provided), digest(expected))) {
    logger.warn('Requête interne refusée (clé absente ou invalide)', { ip: req.ip, url: req.originalUrl });
    return res.status(401).json({ message: 'Non autorisé' });
  }
  next();
};
