// routes/productRoutes.js
const express = require('express');
const { getProducts, updateProductStock } = require('../controllers/productController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();
router.get('/', asyncHandler(getProducts));
router.put("/:productId/stock", authenticateToken, isAdmin, asyncHandler(updateProductStock));


module.exports = router;