import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { CartProvider } from './context/CartContext';
// SEC-09 : intercepteur axios (déconnexion sur token invalide ou expiré)
import './services/authSession';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <CartProvider>
    <App />
    </CartProvider>
);
