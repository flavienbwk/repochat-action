"use client"; // This is a client component 👈🏽

import { useState } from 'react';
import { sendMessage } from './Api';

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessages([...messages, { prompt: input, sender: 'user' }]);
        setInput('');
        const response = await sendMessage("/query", {
            "prompt": input
        });
        setMessages((prevMessages) => [...prevMessages, { text: response.result, sender: 'bot' }]);
    };

    return (
        <div>
            <div className="chat-messages">
                {messages.map((message, index) => (
                    <div key={index} className={`message ${message.sender}`}>
                        {message.text}
                    </div>
                ))}
            </div>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
}
