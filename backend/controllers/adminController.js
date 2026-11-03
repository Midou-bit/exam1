// backend/controllers/adminController.js
/**
 * @module backend/controllers/adminController
 */
const axios = require('axios');
const Order = require('../models/Order'); // Modèle pour les commandes
const Product = require('../models/Product'); // Modèle pour les produits

// URL de la gateway (variable d'environnement, défaut local)
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';

// Récupérer toutes les commandes
/**
 * @description Liste les commandes. Code non monté dans server.js (voir BUG-10 dans docs/AUDIT.md).
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @returns {Promise<void>} 200 commandes ; 500 en cas d'erreur
 */
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des commandes' });
  }
};

// Changer l'état d'une commande
/**
 * @description Change le statut d'une commande et notifie. Code non monté dans server.js (voir BUG-10 dans docs/AUDIT.md).
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @returns {Promise<void>} 200 ; 500 en cas d'erreur
 */
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await Order.findByIdAndUpdate(id, { status });
    await axios.post(`${GATEWAY_URL}/notify`, {
      message: `Le statut de la commande ${id} a été mis à jour en "${status}".`,
    });
    res.json({ message: `Statut de la commande ${id} mis à jour` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur de mise à jour du statut de la commande' });
  }
};

// Valider une commande
/**
 * @description Valide une commande et notifie. Code non monté dans server.js (voir BUG-10 dans docs/AUDIT.md).
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @returns {Promise<void>} 200 ; 500 en cas d'erreur
 */
exports.validateOrder = async (req, res) => {
  const { id } = req.params;

  try {
    await Order.findByIdAndUpdate(id, { status: 'Validée' });
    await axios.post(`${GATEWAY_URL}/notify`, {
      message: `La commande ${id} a été validée.`,
    });
    res.json({ message: `Commande ${id} validée` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la validation de la commande' });
  }
};

// Récupérer tous les produits
/**
 * @description Liste les produits. Code non monté dans server.js (voir BUG-10 dans docs/AUDIT.md).
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @returns {Promise<void>} 200 produits ; 500 en cas d'erreur
 */
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
  }
};

// Mettre à jour le stock d'un produit
/**
 * @description Met à jour un stock et notifie. Code non monté dans server.js (voir BUG-10 dans docs/AUDIT.md).
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @returns {Promise<void>} 200 ; 500 en cas d'erreur
 */
exports.updateProductStock = async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  try {
    await Product.findByIdAndUpdate(id, { stock });
    await axios.post(`${GATEWAY_URL}/notify`, {
      message: `Le stock du produit ${id} a été mis à jour à ${stock}.`,
    });
    res.json({ message: `Stock du produit ${id} mis à jour` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du stock du produit' });
  }
};
