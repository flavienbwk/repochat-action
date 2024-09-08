"use client";

import { useState, useEffect } from 'react';
import Chat from './Chat';
import PasswordModal from './PasswordModal';
import { getSettings } from './Api';
import useAuth from './hooks/useAuth';

import './globals.css';

export default function Home() {
  const [settings, setSettings] = useState({});
  const { token, isTokenValid, showPasswordModal, handleValidate, setShowPasswordModal } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const fetchedSettings = await getSettings();
        setSettings(fetchedSettings);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col justify-between min-h-screen">
      <main className="w-full px-4 flex-grow flex items-center">
        <div className="w-full max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
            <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-10">
              {settings.repo_name && settings.repo_url && (
                <h1 className="text-4xl font-bold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  <a href={settings.repo_url} target="_blank" rel="noopener noreferrer">{settings.repo_name}</a>
                </h1>
              )}
              <h2 className="text-2xl font-bold mb-4 text-center text-gray-700">Repochat assistant</h2>
              {showPasswordModal ? (
                <PasswordModal onValidate={handleValidate} isLoading={isLoading} />
              ) : (
                <Chat token={token} setShowPasswordModal={setShowPasswordModal} />
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full text-center py-4 text-white bg-transparent">
        <p>Deployed with <a href="https://github.com/flavienbwk/repochat-action" target="_blank" rel="noopener noreferrer" className="underline">RepoChat</a></p>
      </footer>
    </div>
  );
}
