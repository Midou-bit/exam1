// validators/productValidators.js : BUG-07, stock entier positif ou nul
/**
 * @module backend/validators/productValidators
 */
const Joi = require('joi');

/**
 * @description Schéma du stock : entier >= 0.
 * @type {joi.ObjectSchema}
 */
exports.stockSchema = Joi.object({
  stock: Joi.number().integer().min(0).required().label('Le stock'),
});
