// backend/controllers/orderController.js
const axios = require('axios');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const orderLog = require('debug')('orderRoutes:console')
const { logger } = require('../logger');

// URL de la gateway et destinataire des notifications (variables d'environnement)
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';
const NOTIFY_ADMIN_EMAIL = process.env.NOTIFY_ADMIN_EMAIL;
// SEC-02 : clé partagée avec la gateway et les microservices
const INTERNAL_HEADERS = { 'x-internal-key': process.env.INTERNAL_API_KEY || '' };

// BUG-03 : remet en stock les quantités déjà décrémentées (échec en cours de commande)
const restoreStock = (items) => Promise.all(
  items.map(({ productId, quantity }) => Product.updateOne({ _id: productId }, { $inc: { stock: quantity } }))
);


exports.createOrder = async (req, res, next) => {
  //userLog(`user is ${JSON.stringify(req.user)}`)
  logger.debug('createOrder', { userId: req.user.userId })
  //const { items, shippingAddress, paymentMethod } = req.body;
  const { items, shippingAddress, paymentMethod, shippingMethod, } = req.body;
  logger.debug('Contenu de la commande', { items: req.body.items })
  //const { items } = req.body;
  let userId = req.user.userId;
  // let shippingAddress = {
  //   "street": "123 Main St",
  //   "city": "New York",
  //   "postalCode": "10001",
  //   "country": "USA"
  // };

  // let paymentMethod =  "Carte bancaire";


  // Vérification du format des données
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: 'Le corps de la requête doit contenir un tableau d\'objets { productId, quantity }.',
    });
  }

  // SEC-01 : quantité entière >= 1 et identifiant produit valide
  for (const { productId, quantity } of items) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'La quantité doit être un entier supérieur ou égal à 1.' });
    }
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: `Identifiant de produit invalide : ${productId}` });
    }
  }

  try {
    // SEC-01 : prix relus en base ; price et total envoyés par le client sont ignorés
    const products = await Product.find({ _id: { $in: items.map((item) => item.productId) } });
    const productsById = new Map(products.map((product) => [product._id.toString(), product]));
    const unknown = items.find(({ productId }) => !productsById.has(String(productId)));
    if (unknown) {
      return res.status(400).json({ message: `Produit introuvable : ${unknown.productId}` });
    }

    const orderDetails = items.map(({ productId, quantity }) => {
      const { price } = productsById.get(String(productId));
      logger.debug('Article de commande', { productId, quantity, price });
      return { productId, quantity, price };
    });

    // Total recalculé côté serveur
    const total = orderDetails.reduce(
      (acc, { price, quantity }) => acc + price * quantity,
      0
    );

    // BUG-03 : décrément atomique, uniquement si le stock est suffisant
    const decremented = [];
    for (const item of orderDetails) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      if (!updated) {
        await restoreStock(decremented);
        const { name } = productsById.get(String(item.productId));
        return res.status(409).json({ message: `Stock insuffisant pour le produit « ${name} ».` });
      }
      decremented.push(item);
    }

    const newOrder = new Order({
      userId,
      items: orderDetails,
      total,
      shippingAddress,
      paymentMethod,
      shippingMethod
    });

    // Sauvegarder la commande dans la base de données (stock rétabli en cas d'échec)
    let savedOrder;
    try {
      savedOrder = await newOrder.save();
    } catch (error) {
      await restoreStock(decremented);
      throw error;
    }

    logger.info('Commande sauvegardée', { orderId: savedOrder._id, total: savedOrder.total });

    // Appel au micro-service de notification
    try {
      await axios.post(`${GATEWAY_URL}/notify`, {
        to: NOTIFY_ADMIN_EMAIL,
        subject: 'Nouvelle Commande Créée',
        text: `Une commande a été créée avec succès pour les produits suivants : \n${orderDetails
          .map((item) => `Produit ID : ${item.productId}, Quantité : ${item.quantity}`)
          .join('\n')}`,
      }, { timeout: 5000, headers: INTERNAL_HEADERS }); // ne bloque jamais la commande (SMTP lent ou bloqué)
    } catch (error) {
      logger.warn('Erreur lors de l\'envoi de la notification', { error: error.message });
    }

    // Appel au micro-service de gestion des stocks
    // try {
    //   await Promise.all(
    //     items.map(({ productId, quantity }) =>
    //       axios.post(`${GATEWAY_URL}/update-stock`, { productId, quantity })
    //     )
    //   );
    // } catch (error) {
    //   console.error('Erreur lors de la mise à jour des stocks', error);
    // }

    // Réponse de succès
    res.status(201).json({
      message: 'Commande créée avec succès',
      order: savedOrder,
    });
  } catch (error) {
    logger.error('Erreur lors de la création de la commande', { error: error.message });
    next(error);
  }
};


// exports.createOrder = async (req, res) => {
//     const products = req.body; // Attente d'un tableau d'objets { productId, quantity }
//     console.log(`products are ${JSON.stringify(products)}`)
    
//     // // Vérification du format des données
//     if (!Array.isArray(products.items) || products.items.length === 0) {
//       return res.status(400).json({ message: 'Le corps de la requête doit contenir un tableau d\'objets { productId, quantity }.' });
//     }
  
//     try {
//     //   // Logique pour traiter chaque produit de la commande
//       const orderDetails = products.items.map(({ productId, quantity }) => {
//         console.log(`Produit ID : ${productId}, Quantité : ${quantity}`);
//         return { productId, quantity };
//       });

//       //TODO : requete avec le modele order pour ajouter les commande en db
  
//     //   // Appel au micro-service de notification
//       try {
//         await axios.post(`${GATEWAY_URL}/notify`, {
//           to: NOTIFY_ADMIN_EMAIL,
//           subject: 'Nouvelle Commande Créée',
//           text: `Une commande a été créée avec succès pour les produits suivants : \n${orderDetails
//             .map((item) => `Produit ID : ${item.productId}, Quantité : ${item.quantity}`)
//             .join('\n')}`,
//         });
//       } catch (error) {
//         console.error('Erreur lors de l\'envoi de la notification', error);
//       }
  
//       // Appel au micro-service de gestion des stocks
//       try {
//         await Promise.all(
//           products.items.map(({ productId, quantity }) =>
//             axios.post(`${GATEWAY_URL}/update-stock`, { productId, quantity })
//           )
//         );
//       } catch (error) {
//         console.error('Erreur lors de la mise à jour des stocks', error);
//       }
  
//       // Réponse de succès
//       res.status(201).json({
//         message: 'Commande créée avec succès',
//         orderDetails,
//       });
//     } catch (error) {
//       console.error('Erreur lors de la création de la commande', error);
//       res.status(500).json({ message: 'Une erreur est survenue lors de la création de la commande.' });
//     }
//   };

// BUG-04 : suppression réelle de la commande (identifiant dans l'URL), toujours une réponse
exports.deleteOrder = async(req, res)=>{
    const { id } = req.params;
    const order = await Order.findByIdAndDelete(id);
    if (!order) {
      return res.status(404).json({ message: "Commande non trouvée." });
    }
    logger.info('Commande supprimée', { orderId: id, by: req.user.userId });
    res.status(200).json({ message: `Commande ${id} supprimée.` });
}

exports.getOrders = async(req, res)=>{

  const orders = await Order.find();
      res.status(200).json(orders);
 
}

// BUG-06 : la validation écrit réellement un statut de l'enum
exports.validateOrder = async (req, res) => {
  const { id } = req.params;
  const order = await Order.findByIdAndUpdate(
    id,
    { status: 'En cours de traitement', updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  if (!order) {
    return res.status(404).json({ message: "Commande non trouvée." });
  }
  res.status(200).json({ message: `Commande ${id} validée avec succès.`, order });
}

exports.updateOrderStatus = async (req, res, next) => {
  const { orderId } = req.params;
  const { status } = req.body;

  logger.info('Mise à jour du statut de commande', { orderId, status });
  try {
    // Vérification des données
    if (!status) {
      return res.status(400).json({ message: "Le statut est requis." });
    }

    // Recherche de la commande et mise à jour
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status, updatedAt: new Date() }, // Mise à jour du statut et de la date de modification
      { new: true, runValidators: true } // Retourne la commande mise à jour ; SEC-06 : enum vérifié
    );

    if (!order) {
      return res.status(404).json({ message: "Commande non trouvée." });
    }

    res.status(200).json({ message: "Statut mis à jour avec succès", order });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la commande', { error: error.message });
    next(error);
  }
};