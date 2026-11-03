import React from 'react';
import { useNavigate } from 'react-router-dom';
import ShippingMethodSelection from '../components/ShippingMethodSelection';
import PaymentMethodSelection from '../components/handlePaymentChange';
import ShippingAddress from '../components/ShippingAddress';


const ShippingPayment = () => {
  const navigate = useNavigate();
  // Naviguer vers la page de commande
  const handleSubmitOrder = () => {
    navigate('/order');
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Livraison et Paiement</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <ShippingAddress /> 
        </div>
        <div>
          <ShippingMethodSelection />
          <PaymentMethodSelection />
        </div>
      </div>
      <hr className="my-4" />
      <div>
      <button
              onClick={handleSubmitOrder}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Passer une commande
      </button>
      </div>
    </div>
  );
};

export default ShippingPayment;
