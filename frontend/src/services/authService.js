import axios from 'axios';

export const signup = async (email, password) => {
  const response = await axios.post('http://localhost:5000/api/auth/signup', { email, password });
  return response.data;
};

export const login = async (email, password) => {
  const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
  if (response.data.token) {
    sessionStorage.setItem('token', response.data.token);
  }
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (email, token, newPassword) => {
  const response = await axios.post('http://localhost:5000/api/auth/reset-password', { email, token, newPassword });
  return response.data;
};

export const logout = () => {
  sessionStorage.removeItem('token');
};