// backend/controllers/adminController.js
const axios = require('axios');
const Order = require('../models/Order'); // Modèle pour les commandes
const Product = require('../models/Product'); // Modèle pour les produits

// Récupérer toutes les commandes
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des commandes' });
  }
};

// Changer l'état d'une commande
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await Order.findByIdAndUpdate(id, { status });
    await axios.post('http://localhost:3001/notify', {
      message: `Le statut de la commande ${id} a été mis à jour en "${status}".`,
    });
    res.json({ message: `Statut de la commande ${id} mis à jour` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur de mise à jour du statut de la commande' });
  }
};

// Valider une commande
exports.validateOrder = async (req, res) => {
  const { id } = req.params;

  try {
    await Order.findByIdAndUpdate(id, { status: 'Validée' });
    await axios.post('http://localhost:3001/notify', {
      message: `La commande ${id} a été validée.`,
    });
    res.json({ message: `Commande ${id} validée` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la validation de la commande' });
  }
};

// Récupérer tous les produits
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
  }
};

// Mettre à jour le stock d'un produit
exports.updateProductStock = async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  try {
    await Product.findByIdAndUpdate(id, { stock });
    await axios.post('http://localhost:3001/notify', {
      message: `Le stock du produit ${id} a été mis à jour à ${stock}.`,
    });
    res.json({ message: `Stock du produit ${id} mis à jour` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du stock du produit' });
  }
};
