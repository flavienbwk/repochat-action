"use client";

import { useState, useEffect } from 'react';
import Chat from './Chat';
import PasswordModal from './PasswordModal';
import { getSettings, checkToken } from './Api';

export default function Home() {
  const [settings, setSettings] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [token, setToken] = useState('');
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const settings = await getSettings();
      setSettings(settings);

      const savedToken = localStorage.getItem('chatToken');
      if (savedToken && settings.interface_password_enabled) {
        setToken(savedToken);
        const isValid = await checkToken(savedToken);
        setIsTokenValid(isValid);
        setShowPasswordModal(!isValid);
      } else if (settings.interface_password_enabled) {
        setShowPasswordModal(true);
      } else {
        setShowPasswordModal(false);
        console.log('Interface secret is not enabled.');
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleValidate = (newToken) => {
    setToken(newToken);
    setShowPasswordModal(false);
    setIsTokenValid(true);
    localStorage.setItem('chatToken', newToken);
  };

  return (
    <html suppressHydrationWarning className="h-full">
      <body className="h-full overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col justify-between h-screen">
          <div className="w-full px-4 h-full flex items-center">
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
                  {(showPasswordModal) ? (
                    <PasswordModal onValidate={handleValidate} isLoading={isLoading} />
                  ) : (
                    <Chat token={token} setShowPasswordModal={setShowPasswordModal} />
                  )}
                </div>
              </div>
            </div>
          </div>
          <footer className="w-full text-center py-4 text-white bg-transparent">
            <p>Deployed with <a href="https://github.com/flavienbwk/repochat-action" target="_blank" rel="noopener noreferrer" className="underline">RepoChat</a></p>
          </footer>
        </div>
      </body>
    </html>
  );
}
