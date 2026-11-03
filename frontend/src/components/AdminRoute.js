/**
 * AdminRoute : affiche ses enfants seulement si un token est présent et que le rôle stocké est "admin",
 * sinon redirige vers l'accueil. Contrôle d'ergonomie uniquement : l'API vérifie le rôle à chaque appel.
 * Props : children (contenu protégé).
 */
import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;