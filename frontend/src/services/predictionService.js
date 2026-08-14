import API from './api';

export const getPrediction = async (predictionData) => {
  const response = await API.post('/predict', predictionData);
  return response.data;
};