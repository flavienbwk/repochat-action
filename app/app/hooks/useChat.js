import { useState } from 'react';

export default function useChat() {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const addMessage = (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
    };

    return {
        messages,
        addMessage,
        isLoading,
        setIsLoading
    };
}
