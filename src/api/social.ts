import { api } from './client';

export const fetchFeed = async (cursor?: string) => {
  const { data } = await api.get('/api/feed', { params: { cursor, limit: 20 } });
  return data;
};

export const fetchLeaderboard = async () => {
  const { data } = await api.get('/api/social/leaderboard');
  return data;
};

export const searchUsers = async (query: string) => {
  const { data } = await api.get('/api/users/search', { params: { q: query } });
  return data;
};

export const fetchUserProfile = async (username: string) => {
  const { data } = await api.get(`/api/users/${username}`);
  return data;
};

export const followUser = async (username: string) => {
  const { data } = await api.post(`/api/users/${username}/follow`);
  return data;
};

export const fetchChallenges = async () => {
  const { data } = await api.get('/api/social/challenges');
  return data;
};

export const fetchCustomChallenges = async () => {
  const { data } = await api.get('/api/social/custom-challenges');
  return data;
};

export const createCustomChallenge = async (payload: {
  name: string;
  description?: string;
  metric: string;
  target: number;
  endDate: string;
}) => {
  const { data } = await api.post('/api/social/custom-challenges', payload);
  return data;
};

export const joinChallenge = async (id: string) => {
  const { data } = await api.post(`/api/social/custom-challenges/${id}/join`);
  return data;
};
