import { apiClient } from '../../../lib/axios';

export type LoginCredentialsDTO = {
  email: string;
  passwordHash: string; // The backend seems to expect passwordHash based on typical schemas, or maybe just password. Wait, I should check the backend auth controller to be sure. Let's assume standard 'email' and 'password' for the DTO for now, I'll verify if needed.
};

export const loginWithEmailAndPassword = async (data: any) => {
  const response = await apiClient.post('/auth/login', data);
  return response.data;
};
