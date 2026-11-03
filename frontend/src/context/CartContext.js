/**
 * CartContext : état global du panier et des informations de commande (useReducer).
 * État : cart, shippingMethod, paymentMethod, shippingAddress. Non persisté : perdu au rechargement de la page.
 * Exports : cartReducer, CartProvider (props : children), useCart().
 */
import React, { createContext, useContext, useReducer } from 'react';

const CartContext = createContext();

// Réducteur pur : chaque action renvoie un nouvel état, l'état précédent n'est jamais modifié
export const cartReducer = (state, action) => {
  switch (action.type) {
    // Ajout : incrémente la quantité si le produit est déjà présent (aussi utilisé par le bouton +)
    case 'ADD_TO_CART':
      const existingProductIndex = state.cart.findIndex((item) => item.id === action.payload.id);

      if (existingProductIndex >= 0) {
        // BUG-09 : nouvel objet article (l'état précédent n'est jamais modifié)
        const updatedCart = state.cart.map((item, index) =>
          index === existingProductIndex
            ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
            : item,
        );
        return { ...state, cart: updatedCart };
      } else {
        return {
          ...state,
          cart: [...state.cart, { ...action.payload, quantity: 1 }],
        };
      }

    case 'DECREMENT_QUANTITY':
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(item.quantity - 1, 1) } // Ne peut pas être inférieur à 1
            : item,
        ),
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter((item) => item.id !== action.payload.id),
      };

    case 'CLEAR_CART':
      return { ...state, cart: [] };

    case 'SET_SHIPPING_METHOD':
      return { ...state, shippingMethod: action.payload };

    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.payload };
    case 'SET_SHIPPING_ADDRESS':
      return { ...state, shippingAddress: action.payload };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [cartState, dispatch] = useReducer(cartReducer, {
    cart: [],
    // BUG-02 : mêmes valeurs que celles affichées par défaut dans les listes
    shippingMethod: 'colissimo',
    paymentMethod: 'Carte bancaire',
    shippingAddress: {
      street: '',
      city: '',
      postalCode: '',
      country: '',
    },
  });

  return <CartContext.Provider value={{ ...cartState, dispatch }}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
