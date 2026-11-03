// validators/orderValidators.js : schémas d'entrée des commandes
const Joi = require('joi');
const Order = require('../models/Order');

// SEC-06 : seules les valeurs de l'enum du modèle sont acceptées
const STATUSES = Order.schema.path('status').enumValues;

exports.statusSchema = Joi.object({
  status: Joi.string().valid(...STATUSES).required().label('Le statut'),
});
