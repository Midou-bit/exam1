// backend/seeder.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product'); // Assurez-vous que le chemin est correct

dotenv.config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connecté pour le seed'))
  .catch((err) => console.error('Erreur de connexion à MongoDB', err));

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

// Fonction pour insérer les produits
const seedProducts = async () => {
  try {
    // Supprimer les anciens produits (optionnel)
    await Product.deleteMany();

    // Insérer les nouveaux produits
    await Product.insertMany(products);

    console.log('Jeux de produits insérés avec succès !');
    process.exit();
  } catch (error) {
    console.error('Erreur lors de l\'insertion des produits', error);
    process.exit(1);
  }
};

// Lancer le seed
seedProducts();