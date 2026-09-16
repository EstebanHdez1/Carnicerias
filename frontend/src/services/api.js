// Centralized API client with JWT and error translation
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('carniceria_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (response.status === 401) {
      // Clear token on 401 and redirect to login if not already there
      localStorage.removeItem('carniceria_token');
      localStorage.removeItem('carniceria_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.message || 'No fue posible completar la operación. Tus datos fueron conservados. Puedes intentarlo nuevamente.';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Error de conexión con el servidor. Verifica tu conexión Wi-Fi.');
    }
    throw error;
  }
}

export const api = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, body, headers = {}) => request(url, { method: 'POST', body: JSON.stringify(body), headers }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body = {}) => request(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
};
