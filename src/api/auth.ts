import axios from 'axios';
import type { LoginData, RegisterData } from '../types/auth';

// Obtener API_URL desde variables de entorno, con valor por defecto para desarrollo
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Asegurarse de que la URL no termine con doble slash
const cleanApiUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

// Configurar axios globalmente
axios.defaults.baseURL = cleanApiUrl;
export { cleanApiUrl as API_URL };

export const login = async (data: LoginData) => {
  const response = await axios.post('/login', data);
  return response.data;
};

export const register = async (data: RegisterData) => {
  const response = await axios.post('/register', data);
  return response.data;
};

// Opcional: Interceptor para manejar errores globalmente
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('Error de API:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);