const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://my-backend-jet-two.vercel.app'
  : 'http://localhost:3002';

const apiClient = {
  async post(endpoint, data) {
    // Normalize the endpoint by removing trailing slash
    const normalizedEndpoint = endpoint.replace(/\/$/, '');
    const url = `${API_URL}${normalizedEndpoint}`;
    console.log(`Sending POST request to: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in POST ${normalizedEndpoint}:`, error);
      throw error;
    }
  },
};

export default apiClient;