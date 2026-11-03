import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { createOrder } from "../services/api";

const Order = () => {
  const navigate = useNavigate();
  //recuperer le context panier
  const { cart, shippingAddress, paymentMethod, shippingMethod, dispatch } =
    useCart(); // Récupérer le contenu du panier à partir du contexte
  // Naviguer vers la page de commande
  const handleShippingPage = () => {
    navigate("/shippig_payment");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Vérifier les champs manquants
    const missingFields = [];
    if (cart.length === 0) missingFields.push("panier");
    if (!shippingAddress) missingFields.push("adresse de livraison");
    if (!shippingMethod) missingFields.push("méthode de livraison");
    if (!paymentMethod) missingFields.push("méthode de paiement");

    if (missingFields.length > 0) {
      alert(
        `Informations manquantes pour la commande :\n${missingFields
          .map((field) => `• ${field}`)
          .join("\n")}`
      );
      return;
    }

    // Vérifier le détail de l'adresse de livraison
    const requiredAddressFields = ["street", "postalCode", "city", "country"];
    const missingAddressDetails = requiredAddressFields.filter(
      (field) => !shippingAddress[field]
    );

    if (missingAddressDetails.length > 0) {
      alert(
        `Adresse de livraison incomplète :\n${missingAddressDetails
          .map((field) => `• ${field}`)
          .join("\n")}`
      );
      return;
    }

    try {
      // Créer la commande seulement si toutes les vérifications passent
      const orderDetails = {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        total: cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
        shippingAddress,
        paymentMethod,
        shippingMethod,
      };

      const response = await createOrder(orderDetails);

      if (response.error) {
        alert(`Erreur : ${response.message || "Échec de la commande"}`);
        return;
      }

      dispatch({ type: "CLEAR_CART" });
      alert("Commande confirmée avec succès !");
    } catch (error) {
      console.error("Erreur lors de la commande", error);
      alert("Une erreur technique est survenue. Veuillez réessayer.");
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Synthèse de la commande</h2>
      {cart.length === 0 ? (
        <p className="text-gray-600">Votre panier est vide.</p>
      ) : (
        <div>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">Produit(s)</th>
                <th className="border border-gray-300 p-2">Quantité(s)</th>
                <th className="border border-gray-300 p-2">
                  Prix Unitaire (€)
                </th>
                <th className="border border-gray-300 p-2">Prix Total (€)</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-2">{item.name}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    {item.price.toFixed(2)}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    {(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right font-bold text-lg mt-4">
            Total :{" "}
            {cart
              .reduce((acc, item) => acc + item.price * item.quantity, 0)
              .toFixed(2)}{" "}
            €
          </p>

          {/* Nouvelles informations ajoutées ici */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Adresse de livraison
              </h3>
              {shippingAddress ? (
                <>
                  <div className="bg-gray-50 p-4 rounded">
                    <p>{shippingAddress.street}</p>
                    <p>
                      {shippingAddress.postalCode} {shippingAddress.city}
                    </p>
                    <p>{shippingAddress.country}</p>
                  </div>
                  <div>
                    <div>
                      <button
                        onClick={handleShippingPage}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                      >
                        Modifier
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">
                  Aucune adresse de livraison fournie.
                </p>
              )}
            </div>

            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">
                  Méthode de livraison
                </h3>
                <div className="bg-gray-50 p-4 rounded">
                  {shippingMethod || "Non spécifiée"}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">
                  Méthode de paiement
                </h3>
                <div className="bg-gray-50 p-4 rounded">
                  {paymentMethod || "Non spécifiée"}
                </div>
              </div>
              <div>
                    <div>
                      <button
                        onClick={handleShippingPage}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                      >
                        Modifier
                      </button>
                    </div>
                  </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmit}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Confirmer la commande
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Order;
