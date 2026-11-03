// validators/orderValidators.js : schémas d'entrée des commandes
/**
 * @module backend/validators/orderValidators
 */
const Joi = require('joi');
const Order = require('../models/Order');

// SEC-06 : seules les valeurs de l'enum du modèle sont acceptées
const STATUSES = Order.schema.path('status').enumValues;

/**
 * @description Schéma du changement de statut : valeurs de l'enum du modèle Order.
 * @type {joi.ObjectSchema}
 */
exports.statusSchema = Joi.object({
  status: Joi.string()
    .valid(...STATUSES)
    .required()
    .label('Le statut'),
});

// BUG-07 : création de commande (price et total ne sont pas acceptés, voir SEC-01)
/**
 * @description Champ d'adresse obligatoire (1 à 200 caractères).
 * @param {string} label - Libellé affiché dans le message d'erreur
 * @returns {joi.StringSchema}
 */
const addressField = (label) => Joi.string().trim().min(1).max(200).required().label(label);

/**
 * @description Schéma de création de commande (price et total refusés, recalculés par le serveur).
 * @type {joi.ObjectSchema}
 */
exports.createOrderSchema = Joi.object({
  items: Joi.array()
    .min(1)
    .required()
    .label('La liste des articles')
    .items(
      Joi.object({
        productId: Joi.string().hex().length(24).required().label("L'identifiant du produit"),
        quantity: Joi.number().integer().min(1).required().label('La quantité'),
      }),
    ),
  shippingAddress: Joi.object({
    street: addressField('La rue'),
    city: addressField('La ville'),
    postalCode: addressField('Le code postal'),
    country: addressField('Le pays'),
  })
    .required()
    .label("L'adresse de livraison"),
  paymentMethod: Joi.string()
    .valid(...Order.schema.path('paymentMethod').enumValues)
    .required()
    .label('Le mode de paiement'),
  shippingMethod: Joi.string()
    .valid(...Order.schema.path('shippingMethod').enumValues)
    .required()
    .label('La méthode de livraison'),
});
