"use client";

import { useState, useRef, useEffect } from 'react';
import { sendMessage } from './Api';
import ReactMarkdown from 'react-markdown';
import useChat from './hooks/useChat';

export default function Chat({ token, setShowPasswordModal }) {
    const { messages, addMessage, isLoading, setIsLoading } = useChat();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        addMessage({ text: input, sender: 'user' });
        setInput('');
        setIsLoading(true);

        try {
            const response = await sendMessage({ "prompt": input }, token);
            addMessage({ text: response.result, sender: 'bot', sources: response.sources });
        } catch (error) {
            if (error.message === 'Unauthorized') {
                localStorage.removeItem('chatToken');
                setShowPasswordModal(true);
            } else {
                addMessage({ text: "An error occurred. Please try again.", sender: 'bot' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.map((message, index) => (
                    <Message key={index} message={message} />
                ))}
                {isLoading && <LoadingSkeleton />}
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

const Message = ({ message }) => (
    <div className={`message ${message.sender}`}>
        {message.sender === 'user' ? (
            message.text
        ) : (
            <>
                <ReactMarkdown>{message.text}</ReactMarkdown>
                {message.sources && <Sources sources={message.sources} />}
            </>
        )}
    </div>
);

const Sources = ({ sources }) => (
    <div className="sources">
        <h4>Sources:</h4>
        <ul>
            {sources.map((source, idx) => (
                <li key={idx}>- {source}</li>
            ))}
        </ul>
    </div>
);

const LoadingSkeleton = () => (
    <div className="message bot skeleton">
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
    </div>
);
