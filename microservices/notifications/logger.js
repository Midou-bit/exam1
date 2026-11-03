// logger.js : journalisation centralisée (Winston) + audit HTTP (morgan)
/**
 * @module microservices/notifications/logger
 */
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const morgan = require('morgan');

const SERVICE = 'notifications';

// Console obligatoire : Render collecte la sortie standard
const transports = [new winston.transports.Console()];

// Fichiers logs/error.log et logs/combined.log (ignorés si le dossier n'est pas accessible en écriture)
try {
  const logDir = path.join(__dirname, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  transports.push(
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
  );
} catch (err) {
  // Pas de fichier possible : on garde uniquement la console
}

/**
 * @description Logger Winston : JSON horodaté, niveau LOG_LEVEL (défaut info), console + logs/error.log + logs/combined.log.
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: SERVICE },
  transports,
});

// Audit HTTP : une entrée JSON par requête (méthode, URL, statut, durée, IP)
/**
 * @description Middleware d'audit HTTP (morgan) : une entrée JSON par requête (méthode, URL, statut, durée, IP) ; sondes /health réussies ignorées.
 * @type {express.RequestHandler}
 */
const httpLogger = morgan(
  (tokens, req, res) => JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    responseTimeMs: Number(tokens['response-time'](req, res)),
    ip: tokens['remote-addr'](req, res),
  }),
  {
    // Les sondes /health réussies (Render, Uptime Kuma) ne polluent pas les logs
    skip: (req, res) => req.originalUrl === '/health' && res.statusCode < 400,
    stream: { write: (line) => logger.info('requete HTTP', { http: JSON.parse(line) }) },
  }
);

module.exports = { logger, httpLogger };
