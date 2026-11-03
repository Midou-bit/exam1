// src/pages/Admin.js
import React, { useState, useEffect } from "react";
import {
  getOrders,
  updateOrderStatus,
  // validateOrder,
  getProducts,
  updateProductStock,
} from "../services/adminApi";

const Admin = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(null);
  const [newStock, setNewStock] = useState({}); // Stock temporaire par produit
  const [updatingStock, setUpdatingStock] = useState(null); // Stock en cours de mise à jour

  useEffect(() => {
    const fetchData = async () => {
      const ordersResponse = await getOrders();
      setOrders(ordersResponse.data);

      const productsResponse = await getProducts();
      setProducts(productsResponse.data);
    };

    fetchData();
  }, []);

  const handleOrderStatusChange = async (orderId, newStatus) => {
    setLoadingOrder(orderId); // Active le loader
    try {
      await updateOrderStatus(orderId, newStatus);

      // Mettre à jour l'état local après une mise à jour réussie
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );

      alert(`Statut de la commande ${orderId} mis à jour en "${newStatus}".`);
    } catch (error) {
      alert("Erreur lors de la mise à jour du statut de la commande.");
    }
    setLoadingOrder(null); // Désactive le loader
  };

  // const handleOrderValidation = async (orderId) => {
  //   await validateOrder(orderId);
  //   alert(`Commande ${orderId} validée.`);
  // };

  const handleStockUpdate = async (productId) => {
    const stockValue = newStock[productId]; // Récupère la valeur saisie pour ce produit

    if (!stockValue || stockValue < 0) {
      alert("Veuillez entrer une quantité de stock valide.");
      return;
    }

    try {
      setUpdatingStock(productId); // Active le loader
      await updateProductStock(productId, stockValue);
      alert(`Stock du produit mis à jour à ${stockValue}.`);

      // Mise à jour de l'affichage avec le nouveau stock
      const updatedProducts = products.map((product) =>
        product._id === productId ? { ...product, stock: stockValue } : product
      );
      setProducts(updatedProducts);

      // Réinitialisation du champ
      setNewStock({ ...newStock, [productId]: "" });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du stock :", error);
      alert("Échec de la mise à jour du stock.");
    } finally {
      setUpdatingStock(null); // Désactive le loader
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Page d'administration</h2>
      {/* Gestion des Commandes */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold">Gestion des Commandes</h3>
        <ul>
          {orders.map((order) => (
            <li key={order._id} className="border p-4 mb-4 rounded shadow">
              <p>
                <strong>ID :</strong> {order._id}
              </p>
              <p>
                <strong>Status :</strong> {order.status}
              </p>
              {order.status !== "Expédiée" && (
                <button
                  onClick={() => handleOrderStatusChange(order._id, "Expédiée")}
                  className="bg-blue-500 text-white px-2 py-1 mt-2 rounded mr-2"
                  disabled={loadingOrder === order._id}
                >
                  {loadingOrder === order._id
                    ? "Mise à jour..."
                    : 'Changer état à "Expédiée"'}
                </button>
              )}

              {order.status !== "En cours de traitement" &&
                order.status !== "Expédiée" && (
                  <button
                    onClick={() =>
                      handleOrderStatusChange(
                        order._id,
                        "En cours de traitement"
                      )
                    }
                    className="bg-green-500 text-white px-2 py-1 mt-2 rounded"
                  >
                    Valider la commande
                  </button>
                )}

              <button
                onClick={() => setSelectedOrder(order)}
                className="bg-gray-500 text-white ml-2 px-2 py-1 mt-2 rounded"
              >
                Détails
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Gestion des Produits */}
      <div>
        <h2 className="text-xl font-bold">Gestion des Produits</h2>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-4 py-2">Nom</th>
              <th className="border px-4 py-2">Prix</th>
              <th className="border px-4 py-2">Stock</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id} className="border">
                <td className="border px-4 py-2">{product.name}</td>
                <td className="border px-4 py-2">{product.price} €</td>
                <td className="border px-4 py-2">{product.stock}</td>
                <td className="border px-4 py-2 flex">
                  <input
                    type="number"
                    placeholder="Nouveau stock"
                    min="0"
                    value={newStock[product._id] || ""}
                    className="border p-2 w-20"
                    onChange={(e) =>
                      setNewStock({
                        ...newStock,
                        [product._id]: e.target.value,
                      })
                    }
                  />
                  <button
                    onClick={() => handleStockUpdate(product._id)}
                    className="bg-green-500 text-white px-2 py-1 ml-2 rounded"
                    disabled={updatingStock === product._id}
                  >
                    {updatingStock === product._id
                      ? "Mise à jour..."
                      : "Mettre à jour"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fenêtre modale pour afficher les détails de la commande */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-1/2">
            <h2 className="text-xl font-bold mb-4">Détails de la Commande</h2>
            <p>
              <strong>ID :</strong> {selectedOrder._id}
            </p>
            <p>
              <strong>Status :</strong> {selectedOrder.status}
            </p>
            <p>
              <strong>Total :</strong> {selectedOrder.total} €
            </p>
            <h3 className="text-lg font-semibold mt-4">Produits :</h3>
            <ul className="mt-2">
              {selectedOrder.items.map((item, index) => (
                <li key={index} className="border-b p-2">
                  <p>
                    <strong>Produit ID :</strong> {item.productId}
                  </p>
                  <p>
                    <strong>Quantité :</strong> {item.quantity}
                  </p>
                  <p>
                    <strong>Prix :</strong> {item.price} €
                  </p>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSelectedOrder(null)}
              className="bg-red-500 text-white px-4 py-2 mt-4 rounded"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
