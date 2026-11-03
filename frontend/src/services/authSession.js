// src/services/authSession.js : gestion de la session côté client
import axios from 'axios';

// Supprime toutes les informations de session
export const clearSession = () => {
  ['token', 'username', 'role'].forEach((key) => localStorage.removeItem(key));
};

// SEC-09 : token invalide ou expiré → session vidée et retour à la connexion
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const sentToken = Boolean(error.config?.headers?.Authorization);
    const tokenRejected =
      status === 401 || (status === 403 && error.response?.data?.error === true);
    if (sentToken && tokenRejected) {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
        // Promesse jamais résolue : l'appelant n'affiche pas d'alerte qui bloquerait la redirection
        return new Promise(() => {});
      }
    }
    return Promise.reject(error);
  },
);
