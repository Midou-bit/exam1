// src/services/adminApi.js
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

export const getOrders = () => {
  try {
    const token = localStorage.getItem("token");
    return axios.get(`${API_BASE_URL}/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la recupération des commandes :", error);
    throw error; // Lancer l'erreur pour que le composant puisse la gérer
  }
};

export const getProducts = () => {
  try {
    const token = localStorage.getItem("token");
    return axios.get(`${API_BASE_URL}/products`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la recupération des produits :", error);
    throw error; // Lancer l'erreur pour que le composant puisse la gérer
  }
};

export const updateOrderStatus = (orderId, status) => {
  try {
    const token = localStorage.getItem("token");
    return axios.put(
      `${API_BASE_URL}/orders/${orderId}/status`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour du statut de la commande :",
      error
    );
    throw error; // Lancer l'erreur pour que le composant puisse la gérer
  }
};

export const validateOrder = (orderId) => {
  try {
    const token = localStorage.getItem("token");
    return axios.put(
      `${API_BASE_URL}/orders/${orderId}/validate`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
    console.error("Erreur lors de la validation de la commande :", error);
    throw error; // Lancer l'erreur pour que le composant puisse la gérer
  }
};

export const updateProductStock = (productId, stock) => {
  try {
    const token = localStorage.getItem("token");
    return axios.put(
      `${API_BASE_URL}/products/${productId}/stock`,
      { stock },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erreur lors de la mise à jour du stock :", error);
    throw error; // Lancer l'erreur pour que le composant puisse la gérer
  }
};
