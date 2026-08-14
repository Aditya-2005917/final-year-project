import API from './api';

export const sendChatMessage = async (message) => {
  const response = await API.post('/chat', { message });
  return response.data;
};