// backend/seeder.js : insère les produits de démo et le compte admin (idempotent, relançable sans risque)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
const { logger } = require('./logger');

// Jeux de produits à insérer
const products = [
  {
    name: 'Ordinateur Portable',
    price: 1000,
    description: 'Un ordinateur portable performant pour tous vos besoins.',
    stock: 20,
  },
  {
    name: 'Smartphone',
    price: 700,
    description: 'Un smartphone moderne avec un écran OLED.',
    stock: 50,
  },
  {
    name: 'Casque Audio',
    price: 150,
    description: 'Un casque audio sans fil avec réduction de bruit.',
    stock: 30,
  },
  {
    name: 'Tablette',
    price: 400,
    description: 'Une tablette légère et puissante.',
    stock: 25,
  },
  {
    name: 'Clavier Mécanique',
    price: 120,
    description: 'Un clavier mécanique pour les gamers.',
    stock: 15,
  },
];

// Produits : insertion uniquement s'ils n'existent pas (clé = nom), pas de doublon ni d'écrasement
const seedProducts = async () => {
  let inserted = 0;
  for (const { name, ...rest } of products) {
    const result = await Product.updateOne({ name }, { $setOnInsert: rest }, { upsert: true });
    inserted += result.upsertedCount;
  }
  logger.info('Produits vérifiés', { inserted, total: products.length });
};

// Admin : créé depuis ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD, uniquement s'il n'existe pas
const seedAdmin = async () => {
  const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    logger.warn('Variables ADMIN_* absentes : compte admin non créé');
    return;
  }
  const existing = await User.findOne({ $or: [{ username: ADMIN_USERNAME }, { email: ADMIN_EMAIL }] });
  if (existing) {
    logger.info('Compte admin déjà présent, aucune création', { username: existing.username });
    return;
  }
  // Le hook pre('save') du modèle User hashe le mot de passe
  await new User({ username: ADMIN_USERNAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' }).save();
  logger.info('Compte admin créé', { username: ADMIN_USERNAME });
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB connecté pour le seed');
    await seedProducts();
    await seedAdmin();
  } catch (error) {
    logger.error('Erreur lors du seed', { error: error.message });
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

// Lancer le seed
seed();
