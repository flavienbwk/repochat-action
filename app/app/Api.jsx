const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const validatePassword = async (password) => {
    const response = await fetch(`${API_URL}/validate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
    });
    return response.json();
};

export const sendMessage = async (parameters, token) => {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(parameters),
    });

    if (response.status === 401) {
        throw new Error('Unauthorized');
    }

    return response.json();
};

export const getSettings = async () => {
    const response = await fetch(`${API_URL}/settings`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response.json();
};

export const checkToken = async (token) => {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    const response = await fetch(`${API_URL}/check`, {
        method: 'GET',
        headers: headers,
    });
    return response.ok;
};  
