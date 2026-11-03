// validators/authValidators.js : schémas d'entrée de l'authentification
const Joi = require('joi');

// SEC-03 : chaînes uniquement, ce qui bloque les opérateurs NoSQL ({"$ne": null}, {"$regex": ...})
exports.loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(100).required().label('Le nom d\'utilisateur'),
  password: Joi.string().min(1).max(128).required().label('Le mot de passe'),
});

// BUG-05 : règles d'inscription (identifiant, email, robustesse du mot de passe)
exports.registerSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(30).required().label('Le nom d\'utilisateur'),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254).required().label('L\'email'),
  password: Joi.string().min(8).max(128).pattern(/[A-Za-z]/).pattern(/\d/).required().label('Le mot de passe')
    .messages({ 'string.pattern.base': 'Le mot de passe doit contenir au moins une lettre et un chiffre' }),
});
