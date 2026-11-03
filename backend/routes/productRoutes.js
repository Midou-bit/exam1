// routes/productRoutes.js
const express = require('express');
const { getProducts, updateProductStock } = require('../controllers/productController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../middlewares/errorHandler');
const validate = require('../middlewares/validate');
const { stockSchema } = require('../validators/productValidators');

const router = express.Router();
router.get('/', asyncHandler(getProducts));
router.put(
  '/:productId/stock',
  authenticateToken,
  isAdmin,
  validate(stockSchema),
  asyncHandler(updateProductStock),
);

module.exports = router;
