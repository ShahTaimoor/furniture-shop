import axiosInstance from '@/redux/slices/auth/axiosInstance';

const fetchSearchResults = async (params = {}) => {
  const response = await axiosInstance.get('/search/products', {
    params,
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

const fetchSearchFilters = async (params = {}) => {
  const response = await axiosInstance.get('/search/filters', {
    params,
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

const fetchPredictiveSuggestions = async (query, limit = 6, signal) => {
  const response = await axiosInstance.get('/search/suggest', {
    params: { q: query, limit },
    signal,
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

const searchService = {
  fetchSearchResults,
  fetchSearchFilters,
  fetchPredictiveSuggestions,
};

export default searchService;

