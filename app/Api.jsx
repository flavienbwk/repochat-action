const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://your-api-url';

export const sendMessage = async (parameters) => {
    const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(parameters),
    });
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

