// src/services/userService.js

import axios from 'axios';

// Configuración base de axios
const API_URL = process.env.VUE_APP_API_URL || '/api';

// Función para obtener el encabezado de autorización
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const userService = {
  // Obtener todos los usuarios
  // Modificación sugerida para userService.js
    getUsers: async () => {
        try {
        const response = await axios.get(`${API_URL}/users`, {
            headers: getAuthHeader()
        });
        return response.data;
        } catch (error) {
        console.error('Error fetching users:', error);
        // Verificar si es un error de conexión
        if (error.code === 'ECONNREFUSED' || !error.response) {
            throw new Error('No se pudo conectar al servidor. Verifica que el backend esté en ejecución.');
        }
        // Verificar si es un error de base de datos
        if (error.response && error.response.status === 500 && 
            error.response.data && error.response.data.includes('database')) {
            throw new Error('Error en la conexión a la base de datos.');
        }
        throw error;
        }
    },

  // Obtener un usuario por ID
  getUserById: async (userId) => {
    try {
      const response = await axios.get(`${API_URL}/users/${userId}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  },

  // Crear un nuevo usuario
  createUser: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/users/create`, userData, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Actualizar un usuario existente
  updateUser: async (userId, userData) => {
    try {
      const response = await axios.put(`${API_URL}/users/update/${userId}`, userData, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  },

  // Eliminar o desactivar un usuario
  deleteUser: async (userId, action = 'deactivate') => {
    try {
      const response = await axios.delete(`${API_URL}/users/delete/${userId}`, {
        headers: getAuthHeader(),
        data: { action }
      });
      return response.data;
    } catch (error) {
      console.error(`Error deleting/deactivating user ${userId}:`, error);
      throw error;
    }
  },

  // Obtener roles (complementario para la gestión de usuarios)
  getRoles: async () => {
    try {
      const response = await axios.get(`${API_URL}/roles`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  }
};

export default userService;