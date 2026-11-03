/**
 * ProtectedRoute : redirige vers /login si aucun token n'est présent dans le localStorage.
 * Props : children (contenu protégé).
 */
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token'); // Vérifiez le token de connexion
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
