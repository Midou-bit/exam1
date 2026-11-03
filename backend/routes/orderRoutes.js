// backend/routes/orderRoutes.js
const express = require('express');
const { createOrder, deleteOrder, getOrders, validateOrder, updateOrderStatus } = require('../controllers/orderController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../middlewares/errorHandler');
const validate = require('../middlewares/validate');
const { statusSchema } = require('../validators/orderValidators');

const router = express.Router();

router.get('/', authenticateToken, isAdmin, asyncHandler(getOrders)); // Accès pour administrateurs
router.post('/', authenticateToken, asyncHandler(createOrder)); // Accès pour utilisateurs connectés
router.delete('/:id', authenticateToken, asyncHandler(deleteOrder)); // Accès pour administrateurs
router.put('/:id/validate', authenticateToken, isAdmin, asyncHandler(validateOrder)); // Accès pour administrateurs
router.put('/:orderId/status', authenticateToken, isAdmin, validate(statusSchema), asyncHandler(updateOrderStatus)); // Accès pour administrateurs


module.exports = router;