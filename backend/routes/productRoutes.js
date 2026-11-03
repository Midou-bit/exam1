// routes/productRoutes.js
const express = require('express');
const { getProducts, updateProductStock } = require('../controllers/productController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();
router.get('/', getProducts);
router.put("/:productId/stock", authenticateToken, isAdmin, updateProductStock);


module.exports = router;