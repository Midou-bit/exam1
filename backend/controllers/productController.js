// controllers/productController.js
/**
 * @module backend/controllers/productController
 */
const Product = require('../models/Product');
const { logger } = require('../logger');

/**
 * @description Liste les produits (public).
 * @route GET /api/products
 * @param {express.Request} req - Requête Express
 * @param {express.Response} res - Réponse Express
 * @returns {Promise<void>} 200 tableau de produits
 * @throws {Error} Erreur base de données (via asyncHandler, 503 si indisponible)
 */
exports.getProducts = async (req, res) => {
    const products = await Product.find();
    res.json(products);
};

/**
 * @description Met à jour le stock d'un produit (administrateur).
 * @route PUT /api/products/:productId/stock
 * @param {express.Request} req - Requête Express (corps validé : stock entier >= 0)
 * @param {express.Response} res - Réponse Express
 * @param {express.NextFunction} next - Passe l'erreur au middleware d'erreur global
 * @returns {Promise<void>} 200 { message, product } ; 404 si absent
 * @throws {Error} Erreur base de données, transmise à next
 */
exports.updateProductStock = async (req, res, next) => {
    try {
      const { stock } = req.body;
      const {productId} = req.params;
  
      if (stock < 0) {
        return res.status(400).json({ message: "Le stock ne peut pas être négatif." });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Produit non trouvé." });
      }
  
      product.stock = stock;
      product.updatedAt = Date.now();
  
      await product.save();
  
      res.json({ message: "Stock mis à jour avec succès.", product });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du stock', { error: error.message });
      next(error);
    }
  };