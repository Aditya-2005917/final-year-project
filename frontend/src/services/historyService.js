import API from './api';

export const getValuationHistory = async () => {
  const response = await API.get('/history');
  return response.data;
};