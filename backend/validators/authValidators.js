// validators/authValidators.js : schémas d'entrée de l'authentification
const Joi = require('joi');

// SEC-03 : chaînes uniquement, ce qui bloque les opérateurs NoSQL ({"$ne": null}, {"$regex": ...})
exports.loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(100).required().label('Le nom d\'utilisateur'),
  password: Joi.string().min(1).max(128).required().label('Le mot de passe'),
});
