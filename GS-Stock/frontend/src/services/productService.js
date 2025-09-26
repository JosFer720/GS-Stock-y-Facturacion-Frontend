// src/services/productService.js
import axios from 'axios';

const API_URL = '/api/productos';  // Ajusta la URL según tu backend real

export const fetchAllProducts = async () => {
  const { data } = await axios.get(API_URL);
  return data;
};

export const createProduct = async (product) => {
  await axios.post(API_URL, product);
};

export const updateProduct = async (id, product) => {
  await axios.put(`${API_URL}/${id}`, product);
};

export const deleteProductById = async (id) => {
  await axios.delete(`${API_URL}/${id}`);
};
