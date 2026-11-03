// validators/productValidators.js : BUG-07, stock entier positif ou nul
const Joi = require('joi');

exports.stockSchema = Joi.object({
  stock: Joi.number().integer().min(0).required().label('Le stock'),
});
