// src/services/api.js
import axios from 'axios';
import { API_URL } from '../config';

const API_BASE_URL = API_URL;

export const fetchProducts = () => axios.get(`${API_BASE_URL}/products`);

export const createOrder = (orderData) => {
    console.log(`appel fonction createOrder avec orderData ${JSON.stringify(orderData)}`)
    const token = localStorage.getItem('token'); // Token de connexion
    return axios.post(`${API_BASE_URL}/orders`, orderData, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};
