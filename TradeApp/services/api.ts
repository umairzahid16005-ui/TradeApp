
const API_BASE_URL = 'http://192.168.30.8:5000/api';
const API_TIMEOUT = 180000;

const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
): Promise<any> => {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, API_TIMEOUT);

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    console.log('API REQUEST:', url);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const text = await response.text();

    let data: any;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || 'Invalid server response' };
    }

    console.log('API STATUS:', response.status);

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `Request failed with status ${response.status}`,
      );
    }

    return data;
  } catch (error: any) {
    console.error('API ERROR:', url, error);

    if (error?.name === 'AbortError') {
      throw new Error(
        'Request timed out. The server or ML model is taking too long.',
      );
    }

    if (
      error?.message?.includes('Network request failed') ||
      error?.message?.includes('Failed to fetch')
    ) {
      throw new Error(
        'Unable to connect. Check Wi-Fi, backend and Windows Firewall.',
      );
    }

    throw new Error(
      error?.message || 'Unable to connect to TradeApp backend',
    );
  } finally {
    clearTimeout(timeout);
  }
};

// AUTH
export const registerUser = async (
  name: string,
  email: string,
  password: string,
) =>
  apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

export const loginUser = async (
  email: string,
  password: string,
) =>
  apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

// DASHBOARD
export const getDashboard = async (token: string) =>
  apiRequest('/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });

// MARKET
export const getMarketData = async () =>
  apiRequest('/market');

export const getCandles = async (symbol: string) => {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    throw new Error('Please select a valid coin symbol.');
  }

  return apiRequest(
    `/candles/${encodeURIComponent(normalizedSymbol)}`,
  );
};

// PREDICTIONS
export const getMyPredictions = async (token: string) =>
  apiRequest('/predictions/my', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const createPrediction = async (
  token: string,
  symbol: string,
) =>
  apiRequest('/predictions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ symbol }),
  });

// SUBSCRIPTIONS
export const createSubscription = async (
  token: string,
  plan: string,
) =>
  apiRequest('/subscriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ plan }),
  });

export const getMySubscription = async (token: string) =>
  apiRequest('/subscriptions/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

// PAYMENTS
export const createPayment = async (
  token: string,
  amount: number,
  gateway: string,
  plan: string,
) =>
  apiRequest('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, gateway, plan }),
  });
