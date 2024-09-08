const API_URL = process.env.NEXT_PUBLIC_API_URL;

const handleResponse = async (response) => {
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Unauthorized');
        }
        throw new Error('API request failed');
    }
    return response.json();
};

export const validatePassword = async (password) => {
    const response = await fetch(`${API_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    });
    return handleResponse(response);
};

export const sendMessage = async (parameters, token) => {
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };

    const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify(parameters),
    });
    return handleResponse(response);
};

export const getSettings = async () => {
    const response = await fetch(`${API_URL}/settings`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
};

export const checkToken = async (token) => {
    const response = await fetch(`${API_URL}/check`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    return response.ok;
};
