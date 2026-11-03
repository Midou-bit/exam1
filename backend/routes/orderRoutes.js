// backend/routes/orderRoutes.js
const express = require('express');
const { createOrder, deleteOrder, getOrders, validateOrder, updateOrderStatus } = require('../controllers/orderController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticateToken, isAdmin, getOrders); // Accès pour administrateurs
router.post('/', authenticateToken, createOrder); // Accès pour utilisateurs connectés
router.delete('/:id', authenticateToken, deleteOrder); // Accès pour administrateurs
router.put('/:id/validate', authenticateToken, isAdmin, validateOrder); // Accès pour administrateurs
router.put('/:orderId/status', authenticateToken, isAdmin, updateOrderStatus); // Accès pour administrateurs


module.exports = router;