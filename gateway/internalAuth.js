// internalAuth.js : SEC-02, seules les requêtes portant la clé interne (x-internal-key) sont acceptées
const crypto = require('crypto');
const { logger } = require('./logger');

// Empreintes de longueur fixe : comparaison à temps constant sans fuite de longueur
const digest = (value) => crypto.createHash('sha256').update(String(value)).digest();

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
