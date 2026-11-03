import { render, screen } from '@testing-library/react';
import App from './App';
import { CartProvider } from './context/CartContext';

// Pas d'appel réseau en test : l'API est simulée (liste de produits vide)
// (fonctions simples : CRA réinitialise les jest.fn avant chaque test)
jest.mock('axios', () => ({
  get: () => Promise.resolve({ data: [] }),
  post: () => Promise.resolve({ data: {} }),
  put: () => Promise.resolve({ data: {} }),
  interceptors: { response: { use: () => {} } },
}));

// Test de fumée : l'application démarre et affiche la barre de navigation
test("affiche le titre de l'application", async () => {
  render(
    <CartProvider>
      <App />
    </CartProvider>,
  );
  expect(await screen.findByText(/Mon Application/i)).toBeInTheDocument();
});
