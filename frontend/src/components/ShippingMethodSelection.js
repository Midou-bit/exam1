import { useCart } from '../context/CartContext';

 const ShippingMethodSelection = () => {
  const { shippingMethod, dispatch } = useCart();
  const shippingOptions = [
    { value: 'colissimo', label: 'Colissimo' },
    { value: 'chronopost', label: 'Chronopost' },
  ];

  const handleShippingChange = (event) => {
    dispatch({ type: 'SET_SHIPPING_METHOD', payload: event.target.value });
  };

  return (
    <div className="border p-4 rounded-md">
      <label htmlFor="shipping" className="block text-sm font-medium text-gray-700">
        Méthode de livraison:
      </label>
      <select 
        id="shipping" 
        value={shippingMethod} 
        onChange={handleShippingChange} 
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      >
        {shippingOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ShippingMethodSelection;