// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { logger } = require('../logger');

exports.authenticateToken = (req, res, next) => {

  const token = req.headers['authorization']?.split(' ')[1];
  // SEC-09 : réponses JSON 401 que le front reconnaît pour fermer la session
  if (!token) return res.status(401).json({ error: true, message: 'Token manquant' });

  try {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        logger.warn('Token JWT invalide', { ip: req.ip, url: req.originalUrl });
        return res.status(401).json({ error: true, message: 'Token invalide ou expiré' });
      }
      req.user = user;
      next();
    });
  } catch (error) { 
    return res.status(401).json({ error: true, message: 'Token invalide ou expiré' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Accès interdit' });
  next();
};