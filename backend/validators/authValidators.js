// validators/authValidators.js : schémas d'entrée de l'authentification
/**
 * @module backend/validators/authValidators
 */
const Joi = require('joi');

// SEC-03 : chaînes uniquement, ce qui bloque les opérateurs NoSQL ({"$ne": null}, {"$regex": ...})
/**
 * @description Schéma du login : chaînes non vides (bloque l'injection d'opérateurs NoSQL).
 * @type {joi.ObjectSchema}
 */
exports.loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(100).required().label("Le nom d'utilisateur"),
  password: Joi.string().min(1).max(128).required().label('Le mot de passe'),
});

// BUG-05 : règles d'inscription (identifiant, email, robustesse du mot de passe)
/**
 * @description Schéma de l'inscription : username alphanumérique 3-30, email valide, mot de passe >= 8 avec lettre et chiffre.
 * @type {joi.ObjectSchema}
 */
exports.registerSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(30).required().label("Le nom d'utilisateur"),
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .max(254)
    .required()
    .label("L'email"),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Za-z]/)
    .pattern(/\d/)
    .required()
    .label('Le mot de passe')
    .messages({
      'string.pattern.base': 'Le mot de passe doit contenir au moins une lettre et un chiffre',
    }),
});
