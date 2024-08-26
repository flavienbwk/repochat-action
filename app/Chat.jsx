"use client";

import { useState, useRef, useEffect } from 'react';
import { sendMessage } from './Api';
import ReactMarkdown from 'react-markdown';

import './globals.css';

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        
        setMessages([...messages, { text: input, sender: 'user' }]);
        setInput('');
        setIsLoading(true);
        
        const response = await sendMessage("/query", { "prompt": input });
        setIsLoading(false);
        setMessages((prevMessages) => [...prevMessages, { text: response.result, sender: 'bot', sources: response.sources }]);
    };

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.map((message, index) => (
                    <div key={index} className={`message ${message.sender}`}>
                        {message.sender === 'user' ? (
                            message.text
                        ) : (
                            <>
                                <ReactMarkdown>{message.text}</ReactMarkdown>
                                {message.sources && (
                                    <div className="sources">
                                        <h4>Sources:</h4>
                                        <ul>
                                            {message.sources.map((source, idx) => (
                                                <li key={idx}>{source}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="message bot skeleton">
                        <div className="skeleton-line"></div>
                        <div className="skeleton-line"></div>
                        <div className="skeleton-line"></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="input-container">
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
