import { useCart } from '../context/CartContext';

const PaymentMethodSelection = () => {
  const { paymentMethod, dispatch } = useCart();
  const paymentOptions = [
    'Carte bancaire',
    'PayPal',
    'Virement',
  ];

  const handlePaymentChange = (event) => {
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: event.target.value });
  };

  return (
    <div className="border p-4 rounded-md">
      <label htmlFor="payment" className="block text-sm font-medium text-gray-700">
      Mode de paiement:
      </label>
      <select id="payment" value={paymentMethod} 
      onChange={handlePaymentChange}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      >
        {paymentOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PaymentMethodSelection;