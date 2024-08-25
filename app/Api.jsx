const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://your-api-url';

export const sendMessage = async (path, parameters) => {
    const response = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(parameters),
    });
    return response.json();
};
