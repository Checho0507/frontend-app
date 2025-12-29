import axios from 'axios';
import type { LoginData, RegisterData } from '../types/auth';

const API_URL = 'http://localhost:8000'; // Cambia esto si usas otro puerto

export const login = async (data: LoginData) => {
  const response = await axios.post(`${API_URL}/login`, data);
  return response.data;
};

export const register = async (data: RegisterData) => {
  const response = await axios.post(`${API_URL}/register`, data);
  return response.data;
};
