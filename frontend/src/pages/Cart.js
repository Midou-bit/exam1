import React from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const Cart = () => {
  const { cart, dispatch } = useCart();
  const navigate = useNavigate();

  // Fonction pour gérer l'incrémentation de la quantité
  const incrementQuantity = (id) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: { id, quantity: 1 }, // Ajoute +1 à la quantité
    });
  };

  // Fonction pour gérer la décrémentation de la quantité
  const decrementQuantity = (id) => {
    dispatch({
      type: 'DECREMENT_QUANTITY',
      payload: { id },
    });
  };

  // Fonction pour gérer la suppression d'un produit
  const handleRemove = (id) => {
    dispatch({
      type: 'REMOVE_FROM_CART',
      payload: { id },
    });
  };

  // Fonction pour vider le panier
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  // Naviguer vers la page de commande
  const handleSubmitOrder = () => {
    navigate('/shippig_payment');
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Mon Panier</h2>
      {cart.length === 0 ? (
        <p>Votre panier est vide</p>
      ) : (
        <div className="space-y-4">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">Produit</th>
                <th className="border border-gray-300 p-2">Prix Unitaire (€)</th>
                <th className="border border-gray-300 p-2">Quantité</th>
                <th className="border border-gray-300 p-2">Prix Total (€)</th>
                <th className="border border-gray-300 p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-2">{item.name}</td>
                  <td className="border border-gray-300 p-2">{item.price}</td>
                  <td className="border border-gray-300 p-2 flex items-center justify-center">
                    <button
                      onClick={() => decrementQuantity(item.id)}
                      className="bg-gray-300 px-2 py-1 rounded-l"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      readOnly
                      className="text-center w-12 border border-gray-300 mx-1"
                    />
                    <button
                      onClick={() => incrementQuantity(item.id)}
                      className="bg-gray-300 px-2 py-1 rounded-r"
                    >
                      +
                    </button>
                  </td>
                  <td className="border border-gray-300 p-2">
                    {(item.price * item.quantity).toFixed(2)}
                  </td>
                  <td className="border border-gray-300 p-2">
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right font-bold text-lg mt-4">
            Total :{' '}
            {cart
              .reduce((acc, item) => acc + item.price * item.quantity, 0)
              .toFixed(2)}{' '}
            €
          </p>
          <div className="flex space-x-4 mt-4">
            <button
              onClick={clearCart}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Vider le panier
            </button>
            <button
              onClick={handleSubmitOrder}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Passer une commande
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
